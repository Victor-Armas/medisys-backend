import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma-client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  private prisma: PrismaClient;

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });

    this.prisma = new PrismaClient({ adapter });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: {
    email: string;
    password: string;
    name: string;
    role?: 'ADMIN_SISTEMA' | 'ADMIN_CONSULTORIO' | 'DOCTOR' | 'RECEPCIONISTA';
  }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: { ...data, password: hashedPassword },
    });
  }
}
