import { PrismaClient } from '@generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface MedicationExcelRow {
  name: string;
  rxnormCode: string;
  description: string | null;
  form: string | null;
  concentration: string | null;
}

const BATCH_SIZE = 1000;

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Convierte cualquier valor de celda a string de forma segura.
 */
function cellToString(
  value: XLSX.CellObject | string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  // Si es un CellObject (celda de Excel con formato), extraer su valor textual
  if (typeof value === 'object' && 'w' in value) {
    return String(value.w).trim();
  }
  return '';
}

async function main() {
  console.log('\n🚀 [ETL] INICIANDO IMPORTACIÓN DE MEDICAMENTOS DESDE EXCEL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('🧹 Limpiando tabla MedicationCatalog...');
  await prisma.medicationCatalog.deleteMany({});

  const filePath = path.join(process.cwd(), 'data/Medicamentos.xlsx');
  if (!fs.existsSync(filePath)) {
    throw new Error(`❌ No se encontró el archivo en: ${filePath}`);
  }

  console.log('📄 Cargando archivo Excel en memoria...');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData: Record<
    string,
    XLSX.CellObject | string | number | boolean | null | undefined
  >[] = XLSX.utils.sheet_to_json(worksheet, { raw: true });

  console.log(`📊 Total de filas detectadas: ${rawData.length}`);

  let batch: MedicationExcelRow[] = [];
  let totalProcessed = 0;
  let totalInserted = 0;
  let skipped = 0;

  for (const row of rawData) {
    totalProcessed++;

    const name = cellToString(row['name']);
    const rxnormCode = cellToString(row['rxnormCode']);

    if (!name || !rxnormCode) {
      skipped++;
      continue;
    }

    const descriptionRaw = cellToString(row['description']);
    const formRaw = cellToString(row['form']);
    const concentrationRaw = cellToString(row['concentration']);

    batch.push({
      name: normalize(name),
      rxnormCode: rxnormCode,
      description: descriptionRaw ? normalize(descriptionRaw) : null,
      form: formRaw ? normalize(formRaw) : null,
      concentration: concentrationRaw ? normalize(concentrationRaw) : null,
    });

    if (batch.length >= BATCH_SIZE) {
      const result = await prisma.medicationCatalog.createMany({
        data: batch,
        skipDuplicates: true,
      });
      totalInserted += result.count;
      process.stdout.write(
        `\r⏳ Procesados: ${totalProcessed} | Insertados: ${totalInserted} | Omitidos: ${skipped}`,
      );
      batch = [];
    }
  }

  if (batch.length > 0) {
    const result = await prisma.medicationCatalog.createMany({
      data: batch,
      skipDuplicates: true,
    });
    totalInserted += result.count;
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 IMPORTACIÓN EXITOSA');
  console.log(`✅ Registros procesados: ${totalProcessed}`);
  console.log(`✅ Medicamentos insertados: ${totalInserted}`);
  console.log(`⚠️  Omitidos (inválidos): ${skipped}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('\n❌ ERROR FATAL:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
