import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Fila parseada del archivo TXT de SEPOMEX (pipe-delimited).
 * Columnas en orden del dataset oficial:
 * d_codigo|d_asenta|d_tipo_asenta|D_mnpio|d_estado|d_ciudad|d_CP|
 * c_estado|c_oficina|c_CP|c_tipo_asenta|c_mnpio|id_asenta_cpcons|d_zona|c_cve_ciudad
 */
interface SepomexRow {
  postalCode: string; // d_codigo
  neighborhood: string; // d_asenta
  neighborhoodType: string; // d_tipo_asenta
  municipality: string; // D_mnpio
  state: string; // d_estado
  zone: string; // d_zona
  stateCode: string; // c_estado
  municipalityCode: string; // c_mnpio
  sepomexId: string; // id_asenta_cpcons
}

const BATCH_SIZE = 500;

@Injectable()
export class SepomexService {
  private readonly logger = new Logger(SepomexService.name);

  constructor(private prisma: PrismaService) {}

  // ─── CONSULTAS ────────────────────────────────────────────────────────────

  async getStates() {
    return this.prisma.sepomexState.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async getMunicipalities(stateId: string) {
    const state = await this.prisma.sepomexState.findUnique({
      where: { id: stateId },
      select: { id: true },
    });
    if (!state) throw new NotFoundException('Estado no encontrado');

    return this.prisma.sepomexMunicipality.findMany({
      where: { stateId },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Búsqueda por código postal.
   * Devuelve el CP con sus colonias y datos de municipio/estado resueltos.
   * Este es el endpoint que usa el formulario de dirección del paciente.
   */
  async getByPostalCode(code: string) {
    const postalCode = await this.prisma.sepomexPostalCode.findFirst({
      where: { code },
      select: {
        id: true,
        code: true,
        municipality: {
          select: {
            id: true,
            name: true,
            state: { select: { id: true, name: true } },
          },
        },
        neighborhoods: {
          select: { id: true, name: true, type: true, zone: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!postalCode) {
      throw new NotFoundException(`No se encontró el código postal ${code}`);
    }

    return postalCode;
  }

  // ─── IMPORTACIÓN DEL CATÁLOGO ─────────────────────────────────────────────

  /**
   * Importa o actualiza el catálogo SEPOMEX desde el contenido del TXT oficial.
   * Reglas:
   *  - UPSERT only — nunca elimina registros existentes
   *  - Idempotente — seguro de ejecutar múltiples veces
   *  - Procesa en batches de BATCH_SIZE filas para no saturar memoria
   *  - Usa sepomexId (id_asenta_cpcons) para identificar colonias unívocamente
   */
  async importFromTxt(
    fileContent: string,
  ): Promise<{ imported: number; errors: number }> {
    const lines = fileContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // El archivo oficial tiene una línea de encabezado — la omitimos
    const dataLines = lines[0].startsWith('d_codigo') ? lines.slice(1) : lines;

    if (dataLines.length === 0) {
      throw new BadRequestException(
        'El archivo está vacío o tiene formato incorrecto',
      );
    }

    const rows = this.parseLines(dataLines);
    this.logger.log(`Iniciando importación SEPOMEX: ${rows.length} filas`);

    let imported = 0;
    let errors = 0;

    // 1. Upsert estados (únicos por código)
    const stateMap = await this.upsertStates(rows);

    // 2. Upsert municipios (únicos por código + estado)
    const municipalityMap = await this.upsertMunicipalities(rows, stateMap);

    // 3. Upsert códigos postales (únicos por código + municipio)
    const postalCodeMap = await this.upsertPostalCodes(rows, municipalityMap);

    // 4. Upsert colonias en batches (el dataset más grande)
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      try {
        await this.upsertNeighborhoodsBatch(batch, postalCodeMap);
        imported += batch.length;
      } catch (err) {
        this.logger.error(`Error en batch ${i}-${i + BATCH_SIZE}: ${err}`);
        errors += batch.length;
      }
    }

    this.logger.log(
      `Importación SEPOMEX completada: ${imported} importadas, ${errors} errores`,
    );
    return { imported, errors };
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────

  private parseLines(lines: string[]): SepomexRow[] {
    return lines
      .map((line) => {
        const cols = line.split('|');
        if (cols.length < 15) return null;
        return {
          postalCode: cols[0].trim(),
          neighborhood: cols[1].trim(),
          neighborhoodType: cols[2].trim(),
          municipality: cols[3].trim(),
          state: cols[4].trim(),
          zone: cols[13].trim(),
          stateCode: cols[7].trim(),
          municipalityCode: cols[11].trim(),
          sepomexId: cols[12].trim(),
        } as SepomexRow;
      })
      .filter((r): r is SepomexRow => r !== null);
  }

  private async upsertStates(rows: SepomexRow[]): Promise<Map<string, string>> {
    const unique = new Map<string, string>(); // code → name
    rows.forEach((r) => unique.set(r.stateCode, r.state));

    const map = new Map<string, string>(); // code → id
    for (const [code, name] of unique) {
      const state = await this.prisma.sepomexState.upsert({
        where: { code },
        update: { name },
        create: { code, name },
        select: { id: true, code: true },
      });
      map.set(code, state.id);
    }
    return map;
  }

  private async upsertMunicipalities(
    rows: SepomexRow[],
    stateMap: Map<string, string>,
  ): Promise<Map<string, string>> {
    // key: `${stateCode}-${municipalityCode}`
    const unique = new Map<
      string,
      { name: string; stateId: string; code: string }
    >();
    rows.forEach((r) => {
      const key = `${r.stateCode}-${r.municipalityCode}`;
      const stateId = stateMap.get(r.stateCode)!;
      unique.set(key, {
        name: r.municipality,
        stateId,
        code: r.municipalityCode,
      });
    });

    const map = new Map<string, string>(); // key → id
    for (const [key, data] of unique) {
      const muni = await this.prisma.sepomexMunicipality.upsert({
        where: { code_stateId: { code: data.code, stateId: data.stateId } },
        update: { name: data.name },
        create: { code: data.code, name: data.name, stateId: data.stateId },
        select: { id: true },
      });
      map.set(key, muni.id);
    }
    return map;
  }

  private async upsertPostalCodes(
    rows: SepomexRow[],
    municipalityMap: Map<string, string>,
  ): Promise<Map<string, string>> {
    // key: `${stateCode}-${municipalityCode}-${postalCode}`
    const unique = new Map<string, { code: string; municipalityId: string }>();
    rows.forEach((r) => {
      const mKey = `${r.stateCode}-${r.municipalityCode}`;
      const key = `${mKey}-${r.postalCode}`;
      unique.set(key, {
        code: r.postalCode,
        municipalityId: municipalityMap.get(mKey)!,
      });
    });

    const map = new Map<string, string>(); // key → id
    for (const [key, data] of unique) {
      // No hay unique constraint en schema para code+municipalityId juntos
      // buscamos primero para hacer upsert manual
      let pc = await this.prisma.sepomexPostalCode.findFirst({
        where: { code: data.code, municipalityId: data.municipalityId },
        select: { id: true },
      });
      if (!pc) {
        pc = await this.prisma.sepomexPostalCode.create({
          data: data,
          select: { id: true },
        });
      }
      map.set(key, pc.id);
    }
    return map;
  }

  private async upsertNeighborhoodsBatch(
    rows: SepomexRow[],
    postalCodeMap: Map<string, string>,
  ): Promise<void> {
    // Convertimos el batch de filas en data lista para Prisma
    const data = rows
      .map((row) => {
        const pcKey = `${row.stateCode}-${row.municipalityCode}-${row.postalCode}`;
        const postalCodeId = postalCodeMap.get(pcKey);
        if (!postalCodeId || !row.sepomexId) return null;

        return {
          name: row.neighborhood,
          type: row.neighborhoodType,
          zone: row.zone || null,
          postalCodeId,
          sepomexId: row.sepomexId,
        };
      })
      .filter((n): n is any => n !== null);

    if (data.length === 0) return;

    // REGLA DE ORO: En lugar de UPSERT (1x1), usamos createMany (Batch)
    // skipDuplicates: true utiliza el ON CONFLICT DO NOTHING de Postgres
    // Es órdenes de magnitud más rápido y no satura el Pool de conexiones
    await this.prisma.sepomexNeighborhood.createMany({
      data,
      skipDuplicates: true,
    });
  }
}
