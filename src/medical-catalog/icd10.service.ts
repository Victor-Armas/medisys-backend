import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface Icd10SearchResult {
  id: string;
  code: string;
  description: string;
  category: string | null;
}

@Injectable()
export class Icd10Service {
  private readonly logger = new Logger(Icd10Service.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── SEARCH ───────────────────────────────────────────────────────────────

  async search(query: string, limit = 10): Promise<Icd10SearchResult[]> {
    const clean = query.trim();
    if (clean.length < 2) return [];

    return this.prisma.icd10Code.findMany({
      where: {
        isActive: true,
        OR: [
          // 1. PRIORIDAD: Código (ej. "J45" o "J4")
          { code: { startsWith: clean.toUpperCase() } },

          // 2. PRIORIDAD: La descripción empieza con la palabra exacta (ej. "ASMA PREDOMINANTEMENTE...")
          { description: { startsWith: clean, mode: 'insensitive' } },

          // 3. PRIORIDAD: La palabra está en medio de la descripción,
          // pero es una palabra independiente (lleva un espacio antes).
          // Esto EVITA que "ASMA" haga match con "MICOPLASMA".
          { description: { contains: ` ${clean}`, mode: 'insensitive' } },
        ],
      },
      select: { id: true, code: true, description: true, category: true },
      // Tu lógica de orderBy está perfecta:
      // Combina el historial de uso real con orden alfabético
      orderBy: [{ searchCount: 'desc' }, { code: 'asc' }],
      take: Math.min(limit, 20),
    });
  }
  // ─── searchTrauma ───────────────────────────────────────────────────────────────
  async searchTrauma(query: string, limit = 10): Promise<Icd10SearchResult[]> {
    const clean = query.trim();
    if (clean.length < 2) return [];

    return this.prisma.icd10Code.findMany({
      where: {
        isActive: true,
        // REGLA DE ORO: Solo capítulos S y T (Traumatismos y Envenenamientos)
        AND: [
          {
            OR: [{ code: { startsWith: 'S' } }, { code: { startsWith: 'T' } }],
          },
          {
            OR: [
              { code: { startsWith: clean.toUpperCase() } },
              { description: { startsWith: clean, mode: 'insensitive' } },
              { description: { contains: ` ${clean}`, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: { id: true, code: true, description: true, category: true },
      orderBy: [{ searchCount: 'desc' }, { code: 'asc' }],
      take: limit,
    });
  }

  /** Increment searchCount asynchronously — does not block the response. */
  incrementSearchCount(code: string): void {
    this.prisma.icd10Code
      .update({ where: { code }, data: { searchCount: { increment: 1 } } })
      .catch((err: unknown) =>
        this.logger.warn(
          `Could not increment searchCount for ${code}: ${String(err)}`,
        ),
      );
  }

  // ─── IMPORT ───────────────────────────────────────────────────────────────

  /**
   * Imports CMS.gov ICD-10-CM flat file (tab-delimited).
   * Format per line: CODE\tDESCRIPTION
   * Run once, then annually when CMS releases the October update.
   */
  async importFromTxt(
    fileContent: string,
  ): Promise<{ imported: number; errors: number }> {
    const lines = fileContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0)
      throw new BadRequestException('El archivo está vacío');

    let imported = 0;
    let errors = 0;
    const BATCH = 500;

    for (let i = 0; i < lines.length; i += BATCH) {
      const batch = lines.slice(i, i + BATCH);

      const data = batch
        .map((line) => {
          const parts = line.split('\t');
          if (parts.length < 2) return null;
          const code = parts[0].trim().toUpperCase();
          const description = parts[1].trim();
          if (!code || !description) return null;
          return { code, description };
        })
        .filter((r): r is { code: string; description: string } => r !== null);

      try {
        await this.prisma.icd10Code.createMany({
          data,
          skipDuplicates: true,
        });
        imported += data.length;
      } catch {
        errors += data.length;
      }
    }

    this.logger.log(`ICD-10 import: ${imported} imported, ${errors} errors`);
    return { imported, errors };
  }
}
