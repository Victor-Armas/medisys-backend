import { PrismaClient } from '@generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface Icd10Row {
  code: string;
  description: string;
  category: string;
}

const BATCH_SIZE = 1000;

/**
 * Parsea una línea del JSON (que ya es un array de strings)
 * y mapea los campos relevantes a Icd10Row.
 */
function parseRecord(
  record: string[],
  fields: { id: string }[],
): Icd10Row | null {
  // Buscar índices de las columnas que nos interesan
  const catalogKeyIndex = fields.findIndex((f) => f.id === 'CATALOG_KEY');
  const nameIndex = fields.findIndex((f) => f.id === 'NOMBRE');
  const chapterIndex = fields.findIndex((f) => f.id === 'CAPITULO');

  const rawCode = record[catalogKeyIndex]?.trim();
  const rawDescription = record[nameIndex]?.trim();
  const rawCategory = record[chapterIndex]?.trim();

  // Validaciones básicas
  if (!rawCode || !rawDescription) return null;
  if (rawCode === 'CATALOG_KEY' || rawCode.length < 3) return null;

  // Si la categoría está vacía o no existe, asignamos 'GENERAL'
  const category =
    rawCategory && rawCategory.length > 0 ? rawCategory : 'GENERAL';

  return {
    code: rawCode.toUpperCase(),
    description: rawDescription.toUpperCase(),
    category: category.toUpperCase(),
  };
}

async function main() {
  console.log('\n🚀 [ETL] INICIANDO IMPORTACIÓN CIE-10 DESDE JSON');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1. LIMPIEZA AUTOMÁTICA
  console.log('🧹 Limpiando tabla Icd10Code...');
  await prisma.icd10Code.deleteMany({});

  const filePath = path.join(process.cwd(), 'data/CIE-10.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`❌ No se encontró el archivo en: ${filePath}`);
  }

  // 2. LEER Y PARSEAR EL JSON
  const rawData = fs.readFileSync(filePath, { encoding: 'utf8' });
  const jsonData = JSON.parse(rawData);

  if (
    !jsonData.fields ||
    !jsonData.records ||
    !Array.isArray(jsonData.records)
  ) {
    throw new Error(
      '❌ Formato de JSON inválido. Se esperaban "fields" y "records".',
    );
  }

  const fields: { id: string }[] = jsonData.fields;
  const records: string[][] = jsonData.records;

  console.log(`📦 Procesando ${records.length} registros...`);

  let batch: Icd10Row[] = [];
  let totalProcessed = 0;
  let totalInserted = 0;

  for (const record of records) {
    totalProcessed++;
    const parsed = parseRecord(record, fields);

    if (parsed) {
      batch.push(parsed);
    }

    if (batch.length >= BATCH_SIZE) {
      const result = await prisma.icd10Code.createMany({
        data: batch,
        skipDuplicates: true,
      });
      totalInserted += result.count;
      process.stdout.write(
        `\r⏳ Procesados: ${totalProcessed} | Insertados: ${totalInserted}`,
      );
      batch = [];
    }
  }

  // Insertar remanente
  if (batch.length > 0) {
    const result = await prisma.icd10Code.createMany({
      data: batch,
      skipDuplicates: true,
    });
    totalInserted += result.count;
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 IMPORTACIÓN EXITOSA');
  console.log(`✅ Registros procesados: ${totalProcessed}`);
  console.log(`✅ Registros insertados: ${totalInserted}`);
  console.log('💡 Códigos CIE-10 cargados desde JSON correctamente.');
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
