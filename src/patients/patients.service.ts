// src/patients/patients.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RegisterPatientDTO } from './dto/register-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async register(dto: RegisterPatientDTO) {
    const emailExists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (emailExists) throw new ConflictException('El email ya está registrado');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        ...dto,
        password: hashedPassword,
        role: 'PATIENT', // Forzamos el rol aquí por seguridad
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastNamePaternal: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}
