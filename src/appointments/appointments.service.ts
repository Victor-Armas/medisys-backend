// src/appointments/appointments.service.ts

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClinicsService } from '../clinics/clinics.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { ListAppointmentsDto } from './dto/list-appointments.dto';
import {
  APPOINTMENT_LIST_SELECT,
  APPOINTMENT_DETAIL_SELECT,
} from './constants/appointment.select';
import { Prisma, AppointmentStatus } from '@generated/prisma/client';

// Timezone del consultorio — Monterrey CST = UTC-6
// TODO: Migrar a luxon cuando sea necesario soportar múltiples zonas
const CLINIC_UTC_OFFSET_HOURS = 6;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clinicsService: ClinicsService,
  ) {}

  // ── CREAR ─────────────────────────────────────────────────────────────────

  /**
   * Crea una cita desde el panel de staff.
   *
   * Flujo de validación:
   *   1. Verificar que el DoctorClinic existe y está activo
   *   2. Verificar que el slot está disponible (scheduleRanges + no hay cita en ese slot)
   *   3. Verificar que no hay conflicto de horario con otra cita activa
   *   4. Crear la cita
   */
  async create(dto: CreateAppointmentDto, createdByRole: string) {
    // 1. Validar que el médico/consultorio existe
    const doctorClinic = await this.prisma.doctorClinic.findUnique({
      where: { id: dto.doctorClinicId },
      include: {
        doctorProfile: { select: { defaultAppointmentDuration: true } },
        clinic: { select: { name: true, isActive: true } },
      },
    });

    if (!doctorClinic) {
      throw new NotFoundException('Relación médico-consultorio no encontrada');
    }
    if (!doctorClinic.isActive) {
      throw new BadRequestException(
        'El médico no está activo en este consultorio',
      );
    }
    if (!doctorClinic.clinic.isActive) {
      throw new BadRequestException('El consultorio está inactivo');
    }

    // 2. Calcular startTime y endTime en UTC
    const startTime = this.toUtcDateTime(dto.date, dto.startTime);
    const durationMins = doctorClinic.doctorProfile.defaultAppointmentDuration;
    const endTime = new Date(startTime.getTime() + durationMins * 60_000);

    // 3. Verificar que el slot está dentro del horario configurado
    await this.assertSlotIsAvailable(
      dto.doctorClinicId,
      dto.date,
      dto.startTime,
    );

    // 4. Verificar que no hay otra cita activa en ese slot exacto
    await this.assertNoConflict(dto.doctorClinicId, startTime, endTime);

    // 5. Validar que hay info de paciente (registrado o guest)
    if (!dto.patientId && !dto.guestName) {
      throw new BadRequestException(
        'Se requiere patientId o guestName para crear la cita',
      );
    }

    return this.prisma.appointment.create({
      data: {
        doctorClinicId: dto.doctorClinicId,
        patientId: dto.patientId ?? null,
        guestName: dto.guestName ?? null,
        guestPhone: dto.guestPhone ?? null,
        guestEmail: dto.guestEmail ?? null,
        startTime,
        endTime,
        type: dto.type,
        status: 'PENDING',
        reason: dto.reason ?? null,
        internalNotes: dto.internalNotes ?? null,
        homeAddress: dto.homeAddress ?? null,
        bookedVia: 'STAFF',
      },
      select: APPOINTMENT_DETAIL_SELECT,
    });
  }

  // ── LISTAR ────────────────────────────────────────────────────────────────

  /**
   * Lista citas con filtros opcionales.
   *
   * Control de acceso:
   *   - ADMIN_SYSTEM / MAIN_DOCTOR: ven todas las citas de todos los médicos
   *   - DOCTOR: solo ven sus propias citas (filtrado por doctorUserId)
   *   - RECEPTIONIST: ven todas (para gestión de agenda)
   */
  async findAll(
    query: ListAppointmentsDto,
    requestingUserId: string,
    userRole: string,
  ) {
    const {
      dateFrom,
      dateTo,
      status,
      clinicId,
      doctorUserId,
      page = 1,
      limit = 50,
    } = query;

    // Los doctores solo pueden ver sus propias citas
    const effectiveDoctorUserId =
      userRole === 'DOCTOR' ? requestingUserId : doctorUserId;

    // Construir el where dinámico
    const where: Prisma.AppointmentWhereInput = {};

    // Filtro por rango de fechas
    if (dateFrom || dateTo) {
      where.startTime = {};
      if (dateFrom) {
        // Inicio del día en UTC-6
        where.startTime.gte = this.toUtcDateTime(dateFrom, '00:00');
      }
      if (dateTo) {
        // Fin del día en UTC-6 (inicio del día siguiente)
        const endDate = new Date(this.toUtcDateTime(dateTo, '00:00'));
        endDate.setDate(endDate.getDate() + 1);
        where.startTime.lt = endDate;
      }
    }

    if (status) {
      where.status = status;
    }

    // Filtro por médico o consultorio (anidado en doctorClinic)
    if (effectiveDoctorUserId || clinicId) {
      where.doctorClinic = {};
      if (clinicId) {
        where.doctorClinic.clinicId = clinicId;
      }
      if (effectiveDoctorUserId) {
        where.doctorClinic.doctorProfile = {
          userId: effectiveDoctorUserId,
        };
      }
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        select: APPOINTMENT_LIST_SELECT,
        orderBy: { startTime: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { appointments, total, page, limit };
  }

  // ── DETALLE ───────────────────────────────────────────────────────────────

  async findOne(id: string, requestingUserId: string, userRole: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      select: APPOINTMENT_DETAIL_SELECT,
    });

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    // Los doctores solo pueden ver sus propias citas
    if (userRole === 'DOCTOR') {
      const isOwn =
        appointment.doctorClinic.doctorProfile.user.id === requestingUserId;
      if (!isOwn) {
        throw new ForbiddenException('No tienes acceso a esta cita');
      }
    }

    return appointment;
  }

  // ── ACTUALIZAR DATOS ──────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateAppointmentDto,
    requestingUserId: string,
    userRole: string,
  ) {
    const appointment = await this.findOne(id, requestingUserId, userRole);

    // No se pueden editar citas completadas o canceladas
    const immutableStatuses: AppointmentStatus[] = [
      'COMPLETED',
      'CANCELLED',
      'NO_SHOW',
    ];
    if (immutableStatuses.includes(appointment.status)) {
      throw new BadRequestException(
        `No se puede editar una cita con estado ${appointment.status}`,
      );
    }

    // Si cambia la fecha/hora, recalcular los DateTime y validar disponibilidad
    let startTime: Date | undefined;
    let endTime: Date | undefined;

    if (dto.date && dto.startTime) {
      startTime = this.toUtcDateTime(dto.date, dto.startTime);

      // Obtener duración del médico
      const doctorClinic = await this.prisma.doctorClinic.findUnique({
        where: { id: appointment.doctorClinic.id },
        include: {
          doctorProfile: { select: { defaultAppointmentDuration: true } },
        },
      });
      const durationMins =
        doctorClinic?.doctorProfile?.defaultAppointmentDuration ?? 30;
      endTime = new Date(startTime.getTime() + durationMins * 60_000);

      await this.assertSlotIsAvailable(
        appointment.doctorClinic.id,
        dto.date,
        dto.startTime,
      );
      await this.assertNoConflict(
        appointment.doctorClinic.id,
        startTime,
        endTime,
        id, // Excluir la cita actual de la verificación de conflicto
      );
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(dto.type && { type: dto.type }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
        ...(dto.internalNotes !== undefined && {
          internalNotes: dto.internalNotes,
        }),
        ...(dto.homeAddress !== undefined && { homeAddress: dto.homeAddress }),
        ...(dto.guestName !== undefined && { guestName: dto.guestName }),
        ...(dto.guestPhone !== undefined && { guestPhone: dto.guestPhone }),
        ...(dto.guestEmail !== undefined && { guestEmail: dto.guestEmail }),
      },
      select: APPOINTMENT_DETAIL_SELECT,
    });
  }

  // ── CAMBIAR ESTADO ────────────────────────────────────────────────────────

  /**
   * Transiciones de estado válidas:
   *   PENDING    → CONFIRMED | CANCELLED
   *   CONFIRMED  → IN_PROGRESS | CANCELLED | NO_SHOW
   *   IN_PROGRESS → COMPLETED | CANCELLED
   *
   * No hay vuelta atrás desde COMPLETED, CANCELLED o NO_SHOW.
   */
  async updateStatus(
    id: string,
    dto: UpdateAppointmentStatusDto,
    requestingUserId: string,
    userRole: string,
  ) {
    const appointment = await this.findOne(id, requestingUserId, userRole);
    const currentStatus = appointment.status;

    this.assertValidTransition(currentStatus, dto.status);

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: dto.status,
        // Si se cancela, guardamos el motivo en internalNotes
        ...(dto.status === 'CANCELLED' &&
          dto.reason && {
            internalNotes: `Cancelación: ${dto.reason}`,
          }),
      },
      select: APPOINTMENT_DETAIL_SELECT,
    });
  }

  // ── HELPERS PRIVADOS ──────────────────────────────────────────────────────

  /**
   * Verifica que el slot HH:MM existe en el horario configurado del médico.
   * Reutiliza getDoctorAvailability() que ya maneja ScheduleRanges y Overrides.
   */
  private async assertSlotIsAvailable(
    doctorClinicId: string,
    date: string,
    startTimeHHMM: string,
  ): Promise<void> {
    const availability = await this.clinicsService.getDoctorAvailability(
      doctorClinicId,
      { dateFrom: date, dateTo: date },
    );

    const slots = availability[date] ?? [];

    if (!slots.includes(startTimeHHMM)) {
      throw new BadRequestException(
        `El horario ${startTimeHHMM} no está disponible para la fecha ${date}`,
      );
    }
  }

  /**
   * Verifica que no exista otra cita activa que solape el rango [startTime, endTime).
   * @param excludeId - UUID de la cita a excluir (usado en updates para no conflictuar consigo misma)
   */
  private async assertNoConflict(
    doctorClinicId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): Promise<void> {
    const conflicting = await this.prisma.appointment.findFirst({
      where: {
        doctorClinicId,
        id: excludeId ? { not: excludeId } : undefined,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        // Solapamiento: la nueva cita empieza antes de que termine la existente
        // Y la nueva cita termina después de que empieza la existente
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
      select: { id: true, startTime: true },
    });

    if (conflicting) {
      throw new ConflictException(
        `Ya existe una cita activa que solapa con este horario`,
      );
    }
  }

  /**
   * Valida que la transición de estado sea válida según las reglas de negocio.
   */
  private assertValidTransition(
    from: AppointmentStatus,
    to: AppointmentStatus,
  ): void {
    const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
      NO_SHOW: [],
    };

    // IN_PROGRESS no existe en el enum del usuario — usamos el string tal cual
    const allowed = validTransitions[from] ?? [];

    if (!allowed.includes(to)) {
      throw new BadRequestException(`No se puede cambiar de ${from} a ${to}`);
    }
  }

  /** "YYYY-MM-DD" + "HH:MM" → Date UTC (asume timezone CST = UTC-6) */
  private toUtcDateTime(date: string, time: string): Date {
    return new Date(`${date}T${time}:00-06:00`);
  }
}
