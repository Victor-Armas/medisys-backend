import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@generated/prisma/client';

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  const password = await bcrypt.hash('Admin1234!', 10);

  const user = await prisma.user.upsert({
    where: { email: 'victor.961004@outlook.com' },
    update: {},
    create: {
      email: 'victor.961004@outlook.com',
      password,
      firstName: 'Victor',
      middleName: 'Jesus',
      lastNamePaternal: 'Garzon',
      lastNameMaternal: 'Armas',
      role: 'ADMIN_SYSTEM',
      isActive: true,
    },
  });

  console.log('Usuario creado:', user.email, '| rol:', user.role);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
