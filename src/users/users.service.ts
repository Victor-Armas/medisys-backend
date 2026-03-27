import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDTO } from '@users/dto/create-user.dto';
import { Role } from '@generated/prisma/enums';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Busca un usuario por email — usado internamente por AuthService
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  //Crea un nuevo usuario. @throws ConflictException si el email ya está registrado
  async create(dto: CreateUserDTO) {
    // Verificar si el email ya existe antes de intentar insertar
    const EmailExists = await this.findByEmail(dto.email);
    if (EmailExists) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Excluimos el password del objeto retornado — nunca devolver hashes al cliente
    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastNamePaternal: dto.lastNamePaternal,
        lastNameMaternal: dto.lastNameMaternal,
        role: dto.role,
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

  // ─────────────────────────────────────────────────────────────
  // LISTAR todos los usuarios activos excelto doctores y main doctor
  // ─────────────────────────────────────────────────────────────
  async findAll(userRole: string) {
    const hasFullAccess = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'].includes(userRole);

    return this.prisma.user.findMany({
      where: {
        role: { in: [Role.ADMIN_SYSTEM, Role.RECEPTIONIST] },
        ...(hasFullAccess ? {} : { isActive: true }),
      },
      select: {
        id: true,
        firstName: true,
        middleName: true, // Añadido (es opcional en tu prisma)
        lastNamePaternal: true, // <--- Nombre correcto
        lastNameMaternal: true, // <--- Nombre correcto
        email: true,
        role: true,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // BUSCAR un usuario (no doctor) por su userId
  // ─────────────────────────────────────────────────────────────
  async findOne(userId: string) {
    const doctor = await this.prisma.user.findFirst({
      where: {
        id: userId,
        role: { in: [Role.ADMIN_SYSTEM, Role.RECEPTIONIST] },
        doctorProfile: { is: null },
      },
    });

    if (!doctor) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return doctor;
  }
}
