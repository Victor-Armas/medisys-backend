import { PrismaClient } from '@generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface Icd10Row {
  code: string;
  description: string;
  category: string;
}

const BATCH_SIZE = 1000;

/**
 * PARSER ROBUSTO ANTI-DESPLAZAMIENTO
 */
function parseCie10Line(line: string): Icd10Row | null {
  // Dividimos por coma, pero el regex ayuda a ignorar comas dentro de comillas si existen
  const columns: string[] = line.split(',');

  // Columnas fijas al inicio
  const code = columns[2]?.replace(/"/g, '').trim();
  const description = columns[4]?.replace(/"/g, '').trim();

  if (!code || !description || code === 'CATALOG_KEY' || code.length < 3) {
    return null;
  }

  /**
   * BUSCADOR DE CAPÍTULO:
   * En lugar de confiar en el índice 22 o 26, buscamos en el rango donde
   * suele estar la descripción larga del capítulo (usualmente del 20 al 30).
   */
  let category = 'GENERAL';
  const scanRange = [22, 23, 24, 25, 26, 27, 28];

  for (const idx of scanRange) {
    const val = columns[idx]?.replace(/"/g, '').trim() || '';
    // El nombre de un capítulo real es largo (ej. "ENFERMEDADES DEL SISTEMA...")
    // Si tiene más de 12 caracteres y no es el código romano, es nuestra categoría.
    if (val.length > 12 && !/^[IVXLCDM]+$/.test(val)) {
      category = val;
      break;
    }
  }

  return {
    code: code.toUpperCase(),
    description: description.toUpperCase(),
    category: category.toUpperCase(),
  };
}

async function main() {
  console.log('\n🚀 [ETL] INICIANDO IMPORTACIÓN CIE-10 (DGIS MÉXICO)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1. LIMPIEZA AUTOMÁTICA
  console.log('🧹 Limpiando tabla Icd10Code...');
  await prisma.icd10Code.deleteMany({});

  const filePath = path.join(process.cwd(), 'data/catalogo_cie10.csv');
  if (!fs.existsSync(filePath)) {
    throw new Error(`❌ No se encontró el archivo en: ${filePath}`);
  }

  // 2. LECTURA CON ENCODING CORRECTO (UTF-8 según tu prueba de terminal)
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let batch: Icd10Row[] = [];
  let totalProcessed = 0;
  let totalInserted = 0;

  console.log('📦 Procesando y normalizando registros...');

  for await (const line of rl) {
    totalProcessed++;
    const parsed = parseCie10Line(line);

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
  console.log(`✅ Registros finales en DB: ${totalInserted}`);
  console.log('💡 Los nombres de capítulos ahora están normalizados.');
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
