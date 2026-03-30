import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicDTO } from './dto/create-clinic.dto';
import { UpdateClinicDTO } from './dto/update-clinic.dto';
import { CreateScheduleDTO } from './dto/create-schedule.dto';
import { CLINIC_SELECT } from './constants/clinic.select';

@Injectable()
export class ClinicsService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // CREAR consultorio
  // El slug se genera automáticamente desde el nombre
  // ─────────────────────────────────────────────────────────────
  async create(dto: CreateClinicDTO) {
    const slug = await this.generateUniqueSlug(dto.name);

    return this.prisma.clinic.create({
      data: {
        name: dto.name,
        slug,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        rfc: dto.rfc,
        professionalLicense: dto.professionalLicense,
        brandColor: dto.brandColor,
        maxDoctors: dto.maxDoctors ?? 1,
      },
      select: CLINIC_SELECT,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // LISTAR todos los consultorios
  // ADMIN/MAIN_DOCTOR ven todos incluidos inactivos
  // Otros roles solo ven activos
  // ─────────────────────────────────────────────────────────────
  async findAll(userRole: string) {
    const hasFullAccess = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'].includes(userRole);

    return this.prisma.clinic.findMany({
      where: hasFullAccess ? {} : { isActive: true },
      select: CLINIC_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // BUSCAR un consultorio por ID
  // ─────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      select: CLINIC_SELECT,
    });

    if (!clinic) throw new NotFoundException('Consultorio no encontrado');
    return clinic;
  }

  // ─────────────────────────────────────────────────────────────
  // ACTUALIZAR datos del consultorio
  // Si cambia el nombre se regenera el slug
  // ─────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateClinicDTO) {
    await this.findOne(id);

    const data: any = { ...dto };

    if (dto.name) {
      data.slug = await this.generateUniqueSlug(dto.name, id);
    }

    return this.prisma.clinic.update({
      where: { id },
      data,
      select: CLINIC_SELECT,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // TOGGLE — activar o desactivar consultorio
  // ─────────────────────────────────────────────────────────────
  async toggle(id: string) {
    const clinic = await this.findOne(id);

    return this.prisma.clinic.update({
      where: { id },
      data: { isActive: !clinic.isActive },
      select: CLINIC_SELECT,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // AGREGAR bloque horario a un médico en un consultorio
  // Valida: capacidad del consultorio, que el médico pertenece,
  // que endTime > startTime, y que no haya solapamiento
  // ─────────────────────────────────────────────────────────────
  async addSchedule(
    dto: CreateScheduleDTO,
    requestingUserId: string,
    userRole: string,
  ) {
    const doctorClinic = await this.prisma.doctorClinic.findUnique({
      where: { id: dto.doctorClinicId },
      include: {
        clinic: true,
        doctorProfile: { include: { user: true } },
      },
    });

    if (!doctorClinic)
      throw new NotFoundException('Relación médico-consultorio no encontrada');

    // Verificar permiso: ADMIN/MAIN_DOCTOR gestionan todo
    // DOCTOR solo gestiona los suyos si canManageOwnSchedule = true
    const isOwnProfile =
      doctorClinic.doctorProfile.user.id === requestingUserId;
    const canManage = doctorClinic.doctorProfile.canManageOwnSchedule;
    const isAdmin = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'].includes(userRole);

    if (!isAdmin && !(isOwnProfile && canManage)) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar este horario',
      );
    }

    // Validar que endTime > startTime
    if (dto.endTime <= dto.startTime) {
      throw new BadRequestException(
        'La hora de fin debe ser mayor a la hora de inicio',
      );
    }

    // Validar solapamiento con bloques existentes del mismo día
    const existingBlocks = await this.prisma.schedule.findMany({
      where: {
        doctorClinicId: dto.doctorClinicId,
        weekDay: dto.weekDay,
        isActive: true,
      },
    });

    const hasOverlap = existingBlocks.some(
      (b) => dto.startTime < b.endTime && dto.endTime > b.startTime,
    );

    if (hasOverlap) {
      throw new ConflictException(
        'El bloque horario se solapa con uno existente',
      );
    }

    return this.prisma.schedule.create({
      data: {
        doctorClinicId: dto.doctorClinicId,
        weekDay: dto.weekDay,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ELIMINAR bloque horario
  // ─────────────────────────────────────────────────────────────
  async removeSchedule(
    scheduleId: string,
    requestingUserId: string,
    userRole: string,
  ) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        doctorClinic: {
          include: { doctorProfile: { include: { user: true } } },
        },
      },
    });

    if (!schedule) throw new NotFoundException('Bloque horario no encontrado');

    const isOwnProfile =
      schedule.doctorClinic.doctorProfile.user.id === requestingUserId;
    const canManage = schedule.doctorClinic.doctorProfile.canManageOwnSchedule;
    const isAdmin = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'].includes(userRole);

    if (!isAdmin && !(isOwnProfile && canManage)) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar este horario',
      );
    }

    return this.prisma.schedule.delete({ where: { id: scheduleId } });
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

  // ─────────────────────────────────────────────────────────────
  // HELPER — Validar capacidad antes de asignar un médico
  // Se llama desde DoctorsService al hacer createFull o assignProfile
  // ─────────────────────────────────────────────────────────────
  async validateClinicCapacity(clinicId: string): Promise<void> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        maxDoctors: true,
        name: true,
        doctorClinics: { where: { isActive: true }, select: { id: true } },
      },
    });

    if (!clinic) throw new NotFoundException('Consultorio no encontrado');

    if (clinic.doctorClinics.length >= clinic.maxDoctors) {
      throw new BadRequestException(
        `El consultorio "${clinic.name}" ya alcanzó su capacidad máxima de ${clinic.maxDoctors} médico(s)`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HELPER PRIVADO — Generar slug único desde el nombre
  // ─────────────────────────────────────────────────────────────
  private async generateUniqueSlug(
    name: string,
    excludeId?: string,
  ): Promise<string> {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quitar acentos
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    let slug = base;
    let counter = 2;

    while (true) {
      const existing = await this.prisma.clinic.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing || existing.id === excludeId) break;

      slug = `${base}-${counter}`;
      counter++;
    }

    return slug;
  }
}
