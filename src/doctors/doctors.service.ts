import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateDoctorDTO } from './dto/create-doctor.dto';
import { AssignDoctorProfileDTO } from './dto/assign-doctor-profile.dto';
import { DOCTOR_SELECT } from './constants/doctor.select';
import { Role } from '@generated/prisma/enums';
import { ClinicsService } from 'src/clinics/clinics.service';
import { UpdateDoctorProfileDTO } from './dto/update-doctor-profile.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class DoctorsService {
  constructor(
    private prisma: PrismaService,
    private clinicsService: ClinicsService,
    private cloudinary: CloudinaryService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // FLUJO 1: Crear usuario + perfil médico en una sola operación
  // Caso de uso: el admin da de alta a un doctor nuevo desde cero.
  // Usa una transacción para garantizar atomicidad — si algo falla,
  // no queda ni el User ni el DoctorProfile a medias.
  // ─────────────────────────────────────────────────────────────
  async createFull(dto: CreateDoctorDTO) {
    // 1. Verificar email único antes de la transacción
    const emailExists = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (emailExists) {
      throw new ConflictException('El email ya está registrado');
    }

    if (dto.clinicIds?.length) {
      await this.validateClinics(dto.clinicIds);
      for (const clinicId of dto.clinicIds) {
        await this.clinicsService.validateClinicCapacity(clinicId);
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 3. Transacción: User + DoctorProfile + DoctorClinic (si aplica)
    return this.prisma.$transaction(async (tx) => {
      // 3a. Crear el usuario
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          middleName: dto.middleName,
          lastNamePaternal: dto.lastNamePaternal,
          lastNameMaternal: dto.lastNameMaternal,
          phone: dto.phone,
          role: dto.role,
        },
        select: { id: true },
      });

      // 3b. Crear el perfil médico vinculado al usuario
      await tx.doctorProfile.create({
        data: {
          userId: user.id,
          address: dto.address,
          numHome: dto.numHome,
          colony: dto.colony,
          city: dto.city,
          state: dto.state,
          zipCode: dto.zipCode,
          specialty: dto.specialty,
          professionalLicense: dto.professionalLicense,
          university: dto.university,
          fullTitle: dto.fullTitle,
          signatureUrl: dto.signatureUrl,
          // 3c. Crear asignaciones de consultorios en el mismo paso
          doctorClinics: dto.clinicIds?.length
            ? {
                create: dto.clinicIds.map((clinicId, index) => ({
                  clinicId,
                  // El primer consultorio de la lista se marca como principal
                  isPrimary: index === 0,
                  isActive: true,
                })),
              }
            : undefined,
        },
      });

      // 3d. Devolver el usuario completo con su perfil (sin password)
      return tx.user.findUnique({
        where: { id: user.id },
        select: DOCTOR_SELECT,
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // FLUJO 2: Asignar perfil médico a un usuario ya existente
  // Caso de uso: el admin convierte a un recepcionista en doctor,
  // o registra el perfil profesional de alguien ya en el sistema.
  // ─────────────────────────────────────────────────────────────
  async assignProfile(dto: AssignDoctorProfileDTO) {
    // 1. Verificar que el usuario existe
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, role: true, doctorProfile: { select: { id: true } } },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 2. Verificar que el usuario no tenga ya un perfil médico
    if (user.doctorProfile) {
      throw new ConflictException(
        'Este usuario ya tiene un perfil médico asignado',
      );
    }

    if (dto.clinicIds?.length) {
      await this.validateClinics(dto.clinicIds);
      for (const clinicId of dto.clinicIds) {
        await this.clinicsService.validateClinicCapacity(clinicId);
      }
    }

    // 4. Transacción: actualizar rol + crear DoctorProfile + asignar clínicas
    return this.prisma.$transaction(async (tx) => {
      // 4a. Promover el rol del usuario a DOCTOR si no es ya un rol médico
      const isAlreadyDoctor =
        user.role === Role.DOCTOR || user.role === Role.MAIN_DOCTOR;

      if (!isAlreadyDoctor) {
        await tx.user.update({
          where: { id: dto.userId },
          data: { role: Role.DOCTOR },
        });
      }

      // 4b. Crear el perfil médico
      await tx.doctorProfile.create({
        data: {
          userId: dto.userId,
          address: dto.address,
          numHome: dto.numHome,
          colony: dto.colony,
          city: dto.city,
          state: dto.state,
          zipCode: dto.zipCode,
          specialty: dto.specialty,
          professionalLicense: dto.professionalLicense,
          university: dto.university,
          fullTitle: dto.fullTitle,
          signatureUrl: dto.signatureUrl,
          doctorClinics: dto.clinicIds?.length
            ? {
                create: dto.clinicIds.map((clinicId, index) => ({
                  clinicId,
                  isPrimary: index === 0,
                  isActive: true,
                })),
              }
            : undefined,
        },
      });

      // 4c. Devolver usuario completo actualizado
      return tx.user.findUnique({
        where: { id: dto.userId },
        select: DOCTOR_SELECT,
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // LISTAR todos los doctores activos con sus clínicas
  // ─────────────────────────────────────────────────────────────
  async findAll(userRole: string) {
    //Solo los Administradores y MAIN_DOCTOR pueden ver a todos los doctores aunque no esten activos
    const hasFullAccess = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'].includes(userRole);

    return this.prisma.user.findMany({
      where: {
        role: { in: [Role.DOCTOR, Role.MAIN_DOCTOR] },
        doctorProfile: { isNot: null }, // Solo usuarios con perfil médico completo
        ...(hasFullAccess ? {} : { isActive: true }),
      },
      select: DOCTOR_SELECT,
      orderBy: { lastNamePaternal: 'asc' },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // BUSCAR un doctor por su userId
  // ─────────────────────────────────────────────────────────────
  async findOne(userId: string) {
    const doctor = await this.prisma.user.findFirst({
      where: {
        id: userId,
        role: { in: [Role.DOCTOR, Role.MAIN_DOCTOR] },
        doctorProfile: { isNot: null },
      },
      select: DOCTOR_SELECT,
    });

    if (!doctor) {
      throw new NotFoundException('Médico no encontrado');
    }
    return doctor;
  }

  // ─── UPDATE DOCTOR PROFILE ────────────────────────────────────────────────

  async updateProfile(
    doctorProfileId: string,
    dto: UpdateDoctorProfileDTO,
    requestingUserId: string,
    userRole: string,
  ) {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
      select: { id: true, userId: true },
    });
    if (!profile) throw new NotFoundException('Perfil médico no encontrado');

    const isOwn = profile.userId === requestingUserId;
    const isAdmin = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'].includes(userRole);

    // Doctors can edit their own profile; admins can edit any
    if (!isOwn && !isAdmin) {
      throw new ForbiddenException('No tienes permiso para editar este perfil');
    }

    // canManageOwnSchedule can only be changed by admins
    if (dto.canManageOwnSchedule !== undefined && !isAdmin) {
      throw new ForbiddenException(
        'Solo un administrador puede cambiar este permiso',
      );
    }

    return this.prisma.doctorProfile.update({
      where: { id: doctorProfileId },
      data: dto,
    });
  }

  // ─── TOGGLE canManageOwnSchedule ─────────────────────────────────────────

  async toggleSchedulePermission(doctorProfileId: string, userRole: string) {
    const isAdmin = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'].includes(userRole);
    if (!isAdmin) {
      throw new ForbiddenException(
        'Solo un administrador puede cambiar este permiso',
      );
    }

    const profile = await this.prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
      select: {
        id: true,
        canManageOwnSchedule: true,
        user: { select: { firstName: true, lastNamePaternal: true } },
      },
    });
    if (!profile) throw new NotFoundException('Perfil médico no encontrado');

    return this.prisma.doctorProfile.update({
      where: { id: doctorProfileId },
      data: { canManageOwnSchedule: !profile.canManageOwnSchedule },
      select: {
        id: true,
        canManageOwnSchedule: true,
        user: { select: { firstName: true, lastNamePaternal: true } },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // TOGGLE disponibilidad del médico (botón pausa global)
  // Solo el propio médico, ADMIN o MAIN_DOCTOR pueden hacerlo
  // ─────────────────────────────────────────────────────────────

  async toggleDoctorAvailability(
    doctorProfileId: string,
    requestingUserId: string,
    userRole: string,
  ) {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException('Perfil médico no encontrado');

    const isOwn = profile.user.id === requestingUserId;
    const isAdmin = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'].includes(userRole);

    if (!isOwn && !isAdmin) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta disponibilidad',
      );
    }

    return this.prisma.doctorProfile.update({
      where: { id: doctorProfileId },
      data: { isAvailable: !profile.isAvailable },
      select: {
        id: true,
        isAvailable: true,
        user: { select: { firstName: true, lastNamePaternal: true } },
      },
    });
  }

  // ─── SIGNATURE UPLOAD ─────────────────────────────────────────────────────

  async uploadSignature(
    doctorProfileId: string,
    buffer: Buffer<ArrayBufferLike>,
    requestingUserId: string,
    userRole: string,
  ): Promise<{ signatureUrl: string }> {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
      select: { id: true, userId: true, signaturePublicId: true },
    });
    if (!profile) throw new NotFoundException('Perfil médico no encontrado');

    const isOwn = profile.userId === requestingUserId;
    const isAdmin = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'].includes(userRole);
    if (!isOwn && !isAdmin)
      throw new ForbiddenException('Sin permiso para subir firma');

    if (profile.signaturePublicId) {
      await this.cloudinary.deleteByPublicId(profile.signaturePublicId);
    }

    const publicId = this.cloudinary.buildPublicId(
      'medisys/doctors/signatures',
      doctorProfileId,
    );
    const result = await this.cloudinary.uploadStream(
      buffer,
      'medisys/doctors/signatures',
      publicId,
      'image',
    );

    await this.prisma.doctorProfile.update({
      where: { id: doctorProfileId },
      data: {
        signatureUrl: result.secure_url,
        signaturePublicId: result.public_id,
      },
    });

    return { signatureUrl: result.secure_url };
  }

  // ─────────────────────────────────────────────────────────────
  // HELPER PRIVADO: Validar que todos los clinicIds existen y están activos
  // Se usa en createFull y assignProfile para fallar temprano
  // con un mensaje claro antes de entrar a la transacción.
  // ─────────────────────────────────────────────────────────────
  private async validateClinics(clinicIds: string[]) {
    // Eliminar duplicados antes de consultar
    const uniqueIds = [...new Set(clinicIds)];

    const foundClinics = await this.prisma.clinic.findMany({
      where: {
        id: { in: uniqueIds },
        isActive: true,
      },
      select: { id: true },
    });

    if (foundClinics.length !== uniqueIds.length) {
      const foundIds = foundClinics.map((c) => c.id);
      const invalidIds = uniqueIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Los siguientes consultorios no existen o están inactivos: ${invalidIds.join(', ')}`,
      );
    }
  }
}
