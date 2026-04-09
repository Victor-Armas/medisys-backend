import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDTO } from '@users/dto/create-user.dto';
import { Role } from '@generated/prisma/enums';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { USER_SELECT } from './constants/user.select';
import { UpdateUserDTO } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

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
      select: USER_SELECT,
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
      select: USER_SELECT,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // BUSCAR un usuario (no doctor) por su userId
  // ─────────────────────────────────────────────────────────────
  async findOne(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        role: { in: [Role.ADMIN_SYSTEM, Role.RECEPTIONIST] },
        doctorProfile: { is: null },
      },
      select: USER_SELECT,
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────

  async update(userId: string, dto: UpdateUserDTO) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: USER_SELECT,
    });
  }
  // ─── PHOTO UPLOAD ─────────────────────────────────────────────────────────

  async uploadPhoto(
    userId: string,
    buffer: Buffer<ArrayBufferLike>,
  ): Promise<{ photoUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const publicId = this.cloudinary.buildPublicId(
      'medisys/doctors/photos',
      userId,
    );

    const result = await this.cloudinary.uploadStream(
      buffer,
      'medisys/doctors/photos',
      publicId,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        photoUrl: result.secure_url,
        photoPublicId: result.public_id,
      },
    });

    return { photoUrl: result.secure_url };
  }
}
