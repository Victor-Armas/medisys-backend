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
import { CreateScheduleRangeDTO } from './dto/create-schedule-range.dto';
import { CreateScheduleOverrideDTO } from './dto/create-schedule-override.dto';
import {
  CLINIC_SELECT,
  DOCTOR_IN_CLINIC_SELECT,
} from './constants/clinic.select';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import { UpdateScheduleRangeDTO } from './dto/update-schedule-range.dto';
import { UpdateScheduleOverrideDTO } from './dto/update-schedule-override.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { AssignDoctorToClinicDTO } from './dto/assign-doctor-clinic.dto';

@Injectable()
export class ClinicsService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

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
  // LISTAR consultorios (Vista Administrativa/Gestión)
  // ADMIN/MAIN_DOCTOR: ven todos (incluidos inactivos)
  // DOCTOR: solo ve sus clínicas asignadas (activas)
  // ─────────────────────────────────────────────────────────────
  async findAll(userRole: string, userId: string) {
    const hasFullAccess = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'].includes(userRole);

    // Si es Admin o Main, no aplicamos filtros de relación
    if (hasFullAccess) {
      return this.prisma.clinic.findMany({
        select: CLINIC_SELECT,
        orderBy: { name: 'asc' },
      });
    }

    // Si es DOCTOR, filtramos por sus asignaciones en doctorClinics
    if (userRole === 'DOCTOR' && userId) {
      return this.prisma.clinic.findMany({
        where: {
          isActive: true,
          doctorClinics: {
            some: {
              doctorProfile: {
                userId: userId,
              },
              isActive: true, // Solo clínicas donde su relación esté activa
            },
          },
        },
        select: CLINIC_SELECT,
        orderBy: { name: 'asc' },
      });
    }

    // Cualquier otro rol (Receptionist, Patient, etc.) en la vista de gestión no ve nada
    return [];
  }

  async findMyDoctorClinics(userId: string) {
    const items = await this.prisma.doctorClinic.findMany({
      where: {
        doctorProfile: { userId },
        isActive: true,
      },
      select: {
        id: true,
        isPrimary: true,
        clinic: { select: { name: true } },
        doctorProfile: {
          select: {
            user: { select: { firstName: true, lastNamePaternal: true } },
          },
        },
      },
    });
    return items.map((dc) => ({
      id: dc.id,
      clinicName: dc.clinic.name,
      doctorName: [
        dc.doctorProfile.user.firstName,
        dc.doctorProfile.user.lastNamePaternal,
      ]
        .filter(Boolean)
        .join(' '),
      isPrimary: dc.isPrimary,
      isActive: true,
    }));
  }

  // ─────────────────────────────────────────────────────────────
  // LISTAR consultorios para agendamiento (Público)
  // Todos los roles ven todas las clínicas activas
  // ─────────────────────────────────────────────────────────────
  async findAllPublic() {
    return this.prisma.clinic.findMany({
      where: { isActive: true },
      // Aquí podrías usar un SELECT más ligero si no necesitas toda la info
      select: {
        id: true,
        name: true,
      },
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
  // CREAR RANGO HORARIO (ScheduleRange)
  // ─────────────────────────────────────────────────────────────
  async createScheduleRange(
    dto: CreateScheduleRangeDTO,
    requestingUserId: string,
    userRole: string,
  ) {
    const doctorClinic = await this.prisma.doctorClinic.findUnique({
      where: { id: dto.doctorClinicId },
      include: {
        doctorProfile: { include: { user: true } },
      },
    });

    if (!doctorClinic) {
      throw new NotFoundException('Relación médico-consultorio no encontrada');
    }

    const today = new Date().toISOString().slice(0, 10);

    if (dto.dateFrom < today) {
      throw new BadRequestException(
        'No se pueden crear bloques horarios en fechas pasadas',
      );
    }

    const isOwnProfile =
      doctorClinic.doctorProfile.user.id === requestingUserId;
    const canManage = doctorClinic.doctorProfile.canManageOwnSchedule;
    const isAdmin = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'].includes(userRole);

    if (!isAdmin && !(isOwnProfile && canManage)) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar este horario',
      );
    }

    if (dto.endTime <= dto.startTime) {
      throw new BadRequestException(
        'La hora de fin debe ser mayor a la hora de inicio',
      );
    }

    if (dto.dateFrom > dto.dateTo) {
      throw new BadRequestException(
        'La fecha de inicio debe ser menor o igual a la fecha de fin',
      );
    }

    const existingRanges = await this.prisma.scheduleRange.findMany({
      where: {
        doctorClinicId: dto.doctorClinicId,
        weekDay: dto.weekDay,
        isActive: true,
        dateFrom: { lte: dto.dateTo },
        dateTo: { gte: dto.dateFrom },
      },
    });

    const hasOverlap = existingRanges.some(
      (b) => dto.startTime < b.endTime && dto.endTime > b.startTime,
    );

    if (hasOverlap) {
      throw new ConflictException(
        'El rango horario se solapa con uno existente en ese período',
      );
    }
    return this.prisma.scheduleRange.create({
      data: {
        doctorClinicId: dto.doctorClinicId,
        weekDay: dto.weekDay,
        startTime: dto.startTime,
        endTime: dto.endTime,
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREAR EXCEPCIÓN HORARIA (ScheduleOverride)
  // ─────────────────────────────────────────────────────────────
  async createScheduleOverride(
    dto: CreateScheduleOverrideDTO,
    requestingUserId: string,
    userRole: string,
  ) {
    const doctorClinic = await this.prisma.doctorClinic.findUnique({
      where: { id: dto.doctorClinicId },
      include: {
        doctorProfile: { include: { user: true } },
      },
    });

    if (!doctorClinic) {
      throw new NotFoundException('Relación médico-consultorio no encontrada');
    }

    const today = new Date().toISOString().slice(0, 10);
    if (dto.date < today) {
      throw new BadRequestException(
        'No se pueden crear excepciones en fechas pasadas',
      );
    }

    const isOwnProfile =
      doctorClinic.doctorProfile.user.id === requestingUserId;
    const canManage = doctorClinic.doctorProfile.canManageOwnSchedule;
    const isAdmin = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'].includes(userRole);

    if (!isAdmin && !(isOwnProfile && canManage)) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar este horario',
      );
    }

    const needsTime = dto.type === 'CUSTOM' || dto.type === 'AVAILABLE';

    if (needsTime) {
      if (!dto.startTime || !dto.endTime) {
        throw new BadRequestException(
          'startTime y endTime son requeridos para este tipo de excepción',
        );
      }
      if (dto.endTime <= dto.startTime) {
        throw new BadRequestException(
          'La hora de fin debe ser mayor a la hora de inicio',
        );
      }
    }

    const startTime = needsTime ? dto.startTime : undefined;
    const endTime = needsTime ? dto.endTime : undefined;

    const existingOverride = await this.prisma.scheduleOverride.findFirst({
      where: {
        doctorClinicId: dto.doctorClinicId,
        date: dto.date,
      },
    });

    if (existingOverride) {
      throw new ConflictException('Ya existe una excepción para esta fecha');
    }

    return this.prisma.scheduleOverride.create({
      data: {
        doctorClinicId: dto.doctorClinicId,
        date: dto.date,
        type: dto.type,
        startTime,
        endTime,
        note: dto.note,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ELIMINAR EXCEPCIÓN HORARIA (ScheduleOverride)
  // ─────────────────────────────────────────────────────────────
  async deleteScheduleOverride(
    overrideId: string,
    requestingUserId: string,
    userRole: string,
  ) {
    const override = await this.prisma.scheduleOverride.findUnique({
      where: { id: overrideId },
      include: {
        doctorClinic: {
          include: {
            doctorProfile: { include: { user: true } },
          },
        },
      },
    });

    if (!override) {
      throw new NotFoundException('Excepción no encontrada');
    }

    const { doctorProfile } = override.doctorClinic;
    const isOwnProfile = doctorProfile.user.id === requestingUserId;
    const canManage = doctorProfile.canManageOwnSchedule;
    const isAdmin = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'].includes(userRole);

    if (!isAdmin && !(isOwnProfile && canManage)) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar este horario',
      );
    }

    await this.prisma.scheduleOverride.delete({
      where: { id: overrideId },
    });
  }
  // ─────────────────────────────────────────────────────────────
  // ELIMINAR rango horario
  // ─────────────────────────────────────────────────────────────
  async deleteScheduleRange(
    rangeId: string,
    requestingUserId: string,
    userRole: string,
  ) {
    const range = await this.prisma.scheduleRange.findUnique({
      where: { id: rangeId },
      include: {
        doctorClinic: {
          include: { doctorProfile: { include: { user: true } } },
        },
      },
    });

    if (!range) throw new NotFoundException('Bloque horario no encontrado');

    const isOwnProfile =
      range.doctorClinic.doctorProfile.user.id === requestingUserId;
    const canManage = range.doctorClinic.doctorProfile.canManageOwnSchedule;
    const isAdmin = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'].includes(userRole);

    if (!isAdmin && !(isOwnProfile && canManage)) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar este horario',
      );
    }

    return this.prisma.scheduleRange.delete({ where: { id: rangeId } });
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
  // OBTENER DISPONIBILIDAD (Fase 1 - Raw Slots)
  // ─────────────────────────────────────────────────────────────
  async getDoctorAvailability(
    doctorClinicId: string,
    query: GetAvailabilityDto,
  ) {
    const { dateFrom, dateTo } = query;

    if (dateFrom > dateTo) {
      throw new BadRequestException(
        'La fecha inicial no puede ser mayor a la final',
      );
    }

    const doctorClinic = await this.prisma.doctorClinic.findUnique({
      where: { id: doctorClinicId },
      include: {
        doctorProfile: {
          select: { defaultAppointmentDuration: true },
        },
      },
    });

    if (!doctorClinic || !doctorClinic.isActive) {
      throw new NotFoundException(
        'Relación médico-consultorio no encontrada o inactiva',
      );
    }

    const slotDuration = doctorClinic.doctorProfile.defaultAppointmentDuration;

    const ranges = await this.prisma.scheduleRange.findMany({
      where: {
        doctorClinicId,
        isActive: true,
        dateFrom: { lte: dateTo },
        dateTo: { gte: dateFrom },
      },
    });

    const overrides = await this.prisma.scheduleOverride.findMany({
      where: {
        doctorClinicId,
        date: { gte: dateFrom, lte: dateTo },
      },
    });

    const availability: Record<string, string[]> = {};

    let currentDateStr = dateFrom;
    while (currentDateStr <= dateTo) {
      const weekDay = this.weekDayOf(currentDateStr);
      const override = overrides.find((o) => o.date === currentDateStr);

      if (override) {
        if (override.type === 'UNAVAILABLE') {
          availability[currentDateStr] = [];
        } else if (override.startTime && override.endTime) {
          // Cubre tanto CUSTOM como AVAILABLE
          availability[currentDateStr] = this.generateTimeSlots(
            override.startTime,
            override.endTime,
            slotDuration,
          );
        }
      } else {
        const matchedRanges = ranges.filter(
          (r) =>
            r.weekDay === weekDay &&
            r.dateFrom <= currentDateStr &&
            r.dateTo >= currentDateStr,
        );

        const daySlots: string[] = [];
        for (const range of matchedRanges) {
          daySlots.push(
            ...this.generateTimeSlots(
              range.startTime,
              range.endTime,
              slotDuration,
            ),
          );
        }

        const uniqueSlots = [...new Set(daySlots)].sort();
        availability[currentDateStr] = uniqueSlots;
      }

      currentDateStr = this.nextDateStr(currentDateStr);
    }

    return availability;
  }

  // ─────────────────────────────────────────────────────────────
  // ACTUALIZAR rango horario (drag & drop / resize)
  // ─────────────────────────────────────────────────────────────
  async updateScheduleRange(
    rangeId: string,
    dto: UpdateScheduleRangeDTO,
    requestingUserId: string,
    userRole: string,
  ) {
    const range = await this.prisma.scheduleRange.findUnique({
      where: { id: rangeId },
      include: {
        doctorClinic: {
          include: { doctorProfile: { include: { user: true } } },
        },
      },
    });

    if (!range) throw new NotFoundException('Bloque horario no encontrado');

    const isOwnProfile =
      range.doctorClinic.doctorProfile.user.id === requestingUserId;
    const canManage = range.doctorClinic.doctorProfile.canManageOwnSchedule;
    const isAdmin = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'].includes(userRole);

    if (!isAdmin && !(isOwnProfile && canManage)) {
      throw new ForbiddenException(
        'No tienes permiso para modificar este horario',
      );
    }

    const newStart = dto.startTime ?? range.startTime;
    const newEnd = dto.endTime ?? range.endTime;

    if (newEnd <= newStart) {
      throw new BadRequestException(
        'La hora de fin debe ser mayor a la de inicio',
      );
    }

    const newDateFrom = dto.dateFrom ?? range.dateFrom;
    const newDateTo = dto.dateTo ?? range.dateTo;

    if (newDateTo < newDateFrom) {
      throw new BadRequestException(
        'La fecha de fin debe ser mayor o igual a la de inicio',
      );
    }

    // Validar que no retrocedan a fechas pasadas — Punto 1
    const today = new Date().toISOString().slice(0, 10);
    if (newDateFrom < today) {
      throw new BadRequestException(
        'No se puede mover un bloque a una fecha pasada',
      );
    }

    // Verificar solapamiento con otros ranges (excluyendo el actual)
    if (dto.startTime || dto.endTime || dto.dateFrom || dto.dateTo) {
      const weekDay = dto.dateFrom
        ? this.weekDayOf(dto.dateFrom)
        : range.weekDay;

      const conflicting = await this.prisma.scheduleRange.findFirst({
        where: {
          id: { not: rangeId },
          doctorClinicId: range.doctorClinicId,
          weekDay,
          isActive: true,
          dateFrom: { lte: newDateTo },
          dateTo: { gte: newDateFrom },
        },
      });

      if (conflicting) {
        const hasTimeOverlap =
          newStart < conflicting.endTime && newEnd > conflicting.startTime;
        if (hasTimeOverlap) {
          throw new ConflictException(
            'El bloque modificado se solapa con uno existente',
          );
        }
      }
    }

    return this.prisma.scheduleRange.update({
      where: { id: rangeId },
      data: {
        startTime: dto.startTime,
        endTime: dto.endTime,
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
        isActive: dto.isActive,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ACTUALIZAR excepción horaria (drag en calendario)
  // ─────────────────────────────────────────────────────────────
  async updateScheduleOverride(
    overrideId: string,
    dto: UpdateScheduleOverrideDTO,
    requestingUserId: string,
    userRole: string,
  ) {
    const override = await this.prisma.scheduleOverride.findUnique({
      where: { id: overrideId },
      include: {
        doctorClinic: {
          include: { doctorProfile: { include: { user: true } } },
        },
      },
    });

    if (!override) throw new NotFoundException('Excepción no encontrada');

    const isOwnProfile =
      override.doctorClinic.doctorProfile.user.id === requestingUserId;
    const canManage = override.doctorClinic.doctorProfile.canManageOwnSchedule;
    const isAdmin = ['ADMIN_SYSTEM', 'MAIN_DOCTOR'].includes(userRole);

    if (!isAdmin && !(isOwnProfile && canManage)) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta excepción',
      );
    }

    // Validar fecha no pasada — Punto 1
    const today = new Date().toISOString().slice(0, 10);
    if (dto.date && dto.date < today) {
      throw new BadRequestException(
        'No se puede mover una excepción a una fecha pasada',
      );
    }

    // Si cambia la fecha, verificar que no exista otro override ese día
    if (dto.date && dto.date !== override.date) {
      const conflict = await this.prisma.scheduleOverride.findFirst({
        where: {
          id: { not: overrideId },
          doctorClinicId: override.doctorClinicId,
          date: dto.date,
        },
      });
      if (conflict) {
        throw new ConflictException('Ya existe una excepción para esa fecha');
      }
    }

    const newType = dto.type ?? override.type;
    const needsTime = newType === 'CUSTOM' || newType === 'AVAILABLE';

    const startTime = needsTime ? (dto.startTime ?? override.startTime) : null;
    const endTime = needsTime ? (dto.endTime ?? override.endTime) : null;

    if (needsTime && (!startTime || !endTime)) {
      throw new BadRequestException(
        'startTime y endTime son requeridos para este tipo',
      );
    }

    if (needsTime && startTime && endTime && endTime <= startTime) {
      throw new BadRequestException(
        'La hora de fin debe ser mayor a la de inicio',
      );
    }

    return this.prisma.scheduleOverride.update({
      where: { id: overrideId },
      data: {
        date: dto.date,
        type: dto.type,
        startTime,
        endTime,
        note: dto.note,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Establecer Logo para la clinica
  // ─────────────────────────────────────────────────────────────
  async uploadLogo(
    clinicId: string,
    buffer: Buffer,
  ): Promise<{ logoUrl: string }> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, logoPublicId: true },
    });
    if (!clinic) throw new NotFoundException('Consultorio no encontrado');

    if (clinic.logoPublicId) {
      await this.cloudinary.deleteByPublicId(clinic.logoPublicId);
    }

    const publicId = this.cloudinary.buildPublicId(
      'medisys/clinics/logos',
      clinicId,
    );
    const result = await this.cloudinary.uploadStream(
      buffer,
      'medisys/clinics/logos',
      publicId,
    );

    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { logoUrl: result.secure_url, logoPublicId: result.public_id },
    });

    return { logoUrl: result.secure_url };
  }

  // ─────────────────────────────────────────────────────────────
  // Lista de doctores para asignar consultorio (siempre que ya no este ya asignado en ese consultorio)
  // GET /api/clinics/Doctor
  // Solo ADMIN_SYSTEM y MAIN_DOCTOR
  // ─────────────────────────────────────────────────────────────

  async getEligibleDoctors(clinicId: string) {
    //Validar que la clinica exista

    const clinicExists = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true },
    });
    if (!clinicExists) {
      throw new NotFoundException('Consultorio no encontrado');
    }

    return this.prisma.user.findMany({
      where: {
        //que sean doctores
        role: { in: ['DOCTOR', 'MAIN_DOCTOR'] },
        //que esten activos
        isActive: true,
        //que tengan perfil medico
        doctorProfile: {
          is: {
            doctorClinics: {
              none: {
                clinicId: clinicId,
              },
            },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastNamePaternal: true,
        email: true,
        role: true,
        doctorProfile: {
          select: {
            id: true,
            specialty: true,
          },
        },
      },
      orderBy: { firstName: 'asc' },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ASIGNAR DOCTOR A CONSULTORIO
  // POST /api/clinics/:id/assign-doctor
  // Solo ADMIN_SYSTEM y MAIN_DOCTOR
  // ─────────────────────────────────────────────────────────────

  async assignDoctor(clinicId: string, dto: AssignDoctorToClinicDTO) {
    // 1. Verificar que la clínica existe
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, name: true, isActive: true },
    });
    if (!clinic) throw new NotFoundException('Consultorio no encontrado');
    if (!clinic.isActive)
      throw new BadRequestException('El consultorio está inactivo');

    // 2. Verificar que el perfil médico existe
    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { id: dto.doctorProfileId },
      select: { id: true },
    });
    if (!doctorProfile)
      throw new NotFoundException('Perfil médico no encontrado');

    // 3. Verificar que no esté ya asignado
    const existing = await this.prisma.doctorClinic.findUnique({
      where: {
        doctorProfileId_clinicId: {
          doctorProfileId: dto.doctorProfileId,
          clinicId,
        },
      },
    });

    if (existing) {
      // Si ya existe pero estaba inactivo, lo reactivamos
      if (!existing.isActive) {
        return this.prisma.doctorClinic.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            isPrimary: dto.isPrimary ?? existing.isPrimary,
          },
          select: DOCTOR_IN_CLINIC_SELECT,
        });
      }
      throw new ConflictException(
        'El médico ya está asignado a este consultorio',
      );
    }

    // 4. Validar capacidad
    await this.validateClinicCapacity(clinicId);

    // 5. Crear la asignación
    return this.prisma.doctorClinic.create({
      data: {
        clinicId,
        doctorProfileId: dto.doctorProfileId,
        isPrimary: dto.isPrimary ?? false,
        isActive: true,
      },
      select: DOCTOR_IN_CLINIC_SELECT,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // DAR DE BAJA DOCTOR (Soft-Delete)
  // PATCH /api/clinics/:id/doctors/:doctorProfileId/deactivate
  // Solo ADMIN_SYSTEM y MAIN_DOCTOR
  // ─────────────────────────────────────────────────────────────

  async deactivateDoctor(clinicId: string, doctorProfileId: string) {
    const existing = await this.prisma.doctorClinic.findUnique({
      where: {
        doctorProfileId_clinicId: {
          doctorProfileId,
          clinicId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Relación médico-consultorio no encontrada');
    }

    // Solamente ponemos isActive en false
    return this.prisma.doctorClinic.update({
      where: { id: existing.id },
      data: { isActive: false },
      select: DOCTOR_IN_CLINIC_SELECT,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // HELPER PRIVADO: Generar slots
  // ─────────────────────────────────────────────────────────────
  private generateTimeSlots(
    startHhMm: string,
    endHhMm: string,
    durationMinutes: number,
  ): string[] {
    const timeToMins = (timeObj: string) => {
      const [h, m] = timeObj.split(':').map(Number);
      return h * 60 + m;
    };

    const minsToTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const start = timeToMins(startHhMm);
    const end = timeToMins(endHhMm);
    const slots: string[] = [];

    let current = start;
    while (current + durationMinutes <= end) {
      slots.push(minsToTime(current));
      current += durationMinutes;
    }

    return slots;
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

  private nextDateStr(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
  }

  // ─────────────────────────────────────────────────────────────
  // HELPER PRIVADO — weekDay de una fecha string YYYY-MM-DD
  // ─────────────────────────────────────────────────────────────

  private weekDayOf(dateStr: string): number {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  }
}
