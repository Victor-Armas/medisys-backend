import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDTO } from '@users/dto/create-user.dto';

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
    const existe = await this.findByEmail(dto.email);
    if (existe) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Excluimos el password del objeto retornado — nunca devolver hashes al cliente
    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}
