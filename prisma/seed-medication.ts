import { PrismaClient } from '@generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

// Configuración de infraestructura
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

/**
 * REGLA DE TIPADO ESTRICTO:
 * Interface para la fila cruda del Excel CNIS y para el input de Prisma.
 * Cero tolerancia al tipo 'any'.
 */
interface RawCnisRow {
  Clave?: string;
  Insumo?: string;
  Descripción?: string;
  Indicaciones?: string;
}

interface MedicationInput {
  name: string;
  description: string;
  rxnormCode: string;
}

const BATCH_SIZE = 1000; // El "Sweet Spot" para latencia de red vs DB locks

/**
 * DOMAIN LOGIC: Parser Puro.
 * Limpia y estandariza la fila del Excel aislando la lógica de negocio.
 */

function cleanDescription(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();

  // Caso típico CNIS: "Cada tableta contiene: X mg"
  const contieneMatch = normalized.match(/contiene:\s*([^:]+?mg)/i);

  if (contieneMatch) {
    return contieneMatch[1].trim();
  }

  // fallback: cortar antes de presentación/envase
  return normalized
    .split(/Envase|Caja|Frasco|Ampolleta|Jeringa/i)[0]
    .trim()
    .slice(0, 120);
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMedicationRow(row: RawCnisRow): MedicationInput | null {
  const clave = row.Clave?.toString().trim();
  const insumo = row.Insumo?.trim();
  const descripcionRaw = row['Descripción']?.trim();

  // Si no tiene clave o insumo, es una fila vacía o malformada del Excel
  if (!clave || !insumo) return null;

  // Limpiamos la descripción: Tomamos solo la primera línea útil
  // antes de que empiece a detallar "Cada tableta contiene..." o "Envase con..."
  let descripcionCorta = '';
  if (descripcionRaw) {
    descripcionCorta = cleanDescription(descripcionRaw);
  }

  // Construcción del 'name' optimizado para Full-Text Search

  return {
    name: normalize(insumo).toUpperCase(),
    description: normalize(descripcionCorta).toUpperCase(),
    rxnormCode: clave,
  };
}

async function main() {
  console.log('\n🚀 [ETL] MEDICATIONS SEED STARTED (CNIS 2025)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Asegúrate de que el archivo se llame así y esté en la carpeta data/
  const filePath = path.join(process.cwd(), 'data/Medicamentos_CNIS_2025.xlsm');

  if (!fs.existsSync(filePath)) {
    throw new Error(`❌ Archivo no encontrado: ${filePath}`);
  }

  console.log('📄 Cargando archivo Excel en memoria...');

  // Lectura del Excel
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convertimos la hoja a un array de objetos tipados
  const rawData: RawCnisRow[] = XLSX.utils.sheet_to_json(worksheet);

  console.log(`📊 Total de filas detectadas: ${rawData.length}`);
  console.log('\n📦 Iniciando parsing e inserción por lotes...');

  let batch: MedicationInput[] = [];
  let totalProcessedLines = 0;
  let totalInserted = 0;
  let skipped = 0;
  let batchCount = 0;

  for (let i = 0; i < rawData.length; i++) {
    totalProcessedLines++;

    const parsed = parseMedicationRow(rawData[i]);

    if (!parsed) {
      skipped++;
      continue;
    }

    batch.push({
      name: parsed.name,
      description: parsed.description,
      rxnormCode: parsed.rxnormCode,
    });

    // Ejecutar lote cuando se llena el buffer
    if (batch.length >= BATCH_SIZE) {
      batchCount++;
      try {
        const result = await prisma.medicationCatalog.createMany({
          data: batch,
          skipDuplicates: true, // Protege contra re-ejecuciones (basado en el unique name/rxnormCode)
        });

        totalInserted += result.count;
        process.stdout.write(
          `\r⏳ Lotes procesados: ${batchCount} | Registros insertados/ignorados: ${totalInserted} | Filas escaneadas: ${totalProcessedLines}`,
        );
      } catch (err) {
        console.error(`\n❌ Error crítico en el lote ${batchCount}`, err);
      }
      batch = []; // Liberar RAM
    }
  }

  // Insertar el remanente (último lote)
  if (batch.length > 0) {
    batchCount++;
    try {
      const result = await prisma.medicationCatalog.createMany({
        data: batch,
        skipDuplicates: true,
      });
      totalInserted += result.count;
      process.stdout.write(
        `\r⏳ Lotes procesados: ${batchCount} | Registros insertados/ignorados: ${totalInserted} | Filas escaneadas: ${totalProcessedLines}`,
      );
    } catch (err) {
      console.error(`\n❌ Error crítico en el lote final ${batchCount}`, err);
    }
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 [ETL] MEDICATIONS SEED COMPLETED');
  console.log(`📊 Filas totales del Excel  : ${totalProcessedLines}`);
  console.log(`✔  Medicamentos procesados  : ${totalInserted}`);
  console.log(`⚠️  Filas omitidas (vacías)  : ${skipped}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('🔌 Conexión a DB cerrada correctamente.');
  })
  .catch(async (e) => {
    console.error('\n💥 FATAL ERROR:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
