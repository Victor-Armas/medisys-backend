import 'dotenv/config';
import { PrismaClient } from '@prisma-client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  const password = await bcrypt.hash('Admin1234!', 10);

  const user = await prisma.user.upsert({
    where: { email: 'doctor@clinica.mx' },
    update: {},
    create: {
      email: 'doctor@clinica.mx',
      password,
      name: 'Dr. Juan Pérez',
      role: 'DOCTOR',
    },
  });

  console.log('Usuario creado:', user.email, '| rol:', user.role);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
