import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { Prisma } from '@generated/prisma/client';

const CLINIC_OFFSET_HOURS = 6; // CST = UTC-6

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(query: DashboardQueryDto, userId: string, userRole: string) {
    const { from, to } = this.resolveDateRange(query.dateFrom, query.dateTo);
    const doctorFilter = this.buildDoctorFilter(query, userId, userRole);

    const [
      appointmentKpis,
      appointmentsByDay,
      appointmentsByStatus,
      appointmentsByType,
      consultationKpis,
      consultationsByType,
      topDiagnoses,
      doctorPerformance,
      patientsByGender,
      newPatients,
    ] = await Promise.all([
      this.getAppointmentKpis(from, to, doctorFilter, query.clinicId),
      this.getAppointmentsByDay(from, to, doctorFilter, query.clinicId),
      this.getAppointmentsByStatus(from, to, doctorFilter, query.clinicId),
      this.getAppointmentsByType(from, to, doctorFilter, query.clinicId),
      this.getConsultationKpis(from, to, doctorFilter, query.clinicId),
      this.getConsultationsByType(from, to, doctorFilter, query.clinicId),
      this.getTopDiagnoses(from, to, doctorFilter, query.clinicId),
      this.getDoctorPerformance(from, to, query.clinicId),
      this.getPatientsByGender(),
      this.getNewPatients(from, to),
    ]);

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      kpis: {
        ...appointmentKpis,
        ...consultationKpis,
        newPatients,
        completionRate:
          appointmentKpis.totalAppointments > 0
            ? Math.round(
                (appointmentKpis.completedAppointments /
                  appointmentKpis.totalAppointments) *
                  100,
              )
            : 0,
      },
      appointmentsByDay,
      appointmentsByStatus,
      appointmentsByType,
      consultationsByType,
      topDiagnoses,
      doctorPerformance,
      patientsByGender,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private resolveDateRange(
    dateFrom?: string,
    dateTo?: string,
  ): { from: Date; to: Date } {
    const now = new Date();
    const from = dateFrom
      ? this.toUtcStart(dateFrom)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = dateTo
      ? this.toUtcEnd(dateTo)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { from, to };
  }

  private toUtcStart(date: string): Date {
    const parsed = new Date(date);
    // Si es un ISO String (tiene una T), lo respetamos
    if (!isNaN(parsed.getTime()) && date.includes('T')) return parsed;
    // Si es YYYY-MM-DD, le ponemos el inicio del día de la CLÍNICA
    return new Date(`${date}T00:00:00-06:00`);
  }

  private toUtcEnd(date: string): Date {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime()) && date.includes('T')) return parsed;
    // Fin del día de la CLÍNICA
    return new Date(`${date}T23:59:59.999-06:00`);
  }

  private buildDoctorFilter(
    query: DashboardQueryDto,
    userId: string,
    userRole: string,
  ): { doctorUserId?: string } {
    if (userRole === 'DOCTOR') return { doctorUserId: userId };
    if (query.doctorUserId) return { doctorUserId: query.doctorUserId };
    return {};
  }

  private buildWhereAppointment(
    from: Date,
    to: Date,
    doctorFilter: { doctorUserId?: string },
    clinicId?: string,
  ): Prisma.AppointmentWhereInput {
    const where: Prisma.AppointmentWhereInput = {
      OR: [
        {
          status: { not: 'COMPLETED' },
          startTime: { gte: from, lte: to },
        },
        {
          status: 'COMPLETED',
          consultation: {
            consultedAt: { gte: from, lte: to },
          },
        },
        {
          status: 'COMPLETED',
          consultation: null,
          startTime: { gte: from, lte: to },
        },
      ],
    };
    if (clinicId || doctorFilter.doctorUserId) {
      where.doctorClinic = {
        ...(clinicId ? { clinicId } : {}),
        ...(doctorFilter.doctorUserId
          ? { doctorProfile: { userId: doctorFilter.doctorUserId } }
          : {}),
      };
    }
    return where;
  }

  private buildWhereConsultation(
    from: Date,
    to: Date,
    doctorFilter: { doctorUserId?: string },
    clinicId?: string,
  ): Prisma.ConsultationWhereInput {
    const where: Prisma.ConsultationWhereInput = {
      consultedAt: { gte: from, lte: to },
    };
    if (clinicId || doctorFilter.doctorUserId) {
      where.doctorClinic = {
        ...(clinicId ? { clinicId } : {}),
        ...(doctorFilter.doctorUserId
          ? { doctorProfile: { userId: doctorFilter.doctorUserId } }
          : {}),
      };
    }
    return where;
  }

  // ── Appointment KPIs ──────────────────────────────────────────────────────

  private async getAppointmentKpis(
    from: Date,
    to: Date,
    doctorFilter: { doctorUserId?: string },
    clinicId?: string,
  ) {
    const where = this.buildWhereAppointment(from, to, doctorFilter, clinicId);

    const [total, completed, cancelled, noShow, pending, confirmed] =
      await Promise.all([
        this.prisma.appointment.count({ where }),
        this.prisma.appointment.count({
          where: { ...where, status: 'COMPLETED' },
        }),
        this.prisma.appointment.count({
          where: { ...where, status: 'CANCELLED' },
        }),
        this.prisma.appointment.count({
          where: { ...where, status: 'NO_SHOW' },
        }),
        this.prisma.appointment.count({
          where: { ...where, status: 'PENDING' },
        }),
        this.prisma.appointment.count({
          where: { ...where, status: 'CONFIRMED' },
        }),
      ]);

    return {
      totalAppointments: total,
      completedAppointments: completed,
      cancelledAppointments: cancelled,
      noShowAppointments: noShow,
      pendingAppointments: pending,
      confirmedAppointments: confirmed,
    };
  }

  // ── Appointments by day ───────────────────────────────────────────────────

  private async getAppointmentsByDay(
    from: Date,
    to: Date,
    doctorFilter: { doctorUserId?: string },
    clinicId?: string,
  ) {
    const where = this.buildWhereAppointment(from, to, doctorFilter, clinicId);

    const appointments = await this.prisma.appointment.findMany({
      where,
      select: {
        startTime: true,
        status: true,
        consultation: { select: { consultedAt: true } },
      },
    });

    // Group by local date (CST)
    const map = new Map<
      string,
      { total: number; completed: number; cancelled: number }
    >();

    for (const appt of appointments) {
      const referenceDate =
        appt.status === 'COMPLETED' && appt.consultation?.consultedAt
          ? appt.consultation.consultedAt
          : appt.startTime;

      const localDate = new Date(
        referenceDate.getTime() - CLINIC_OFFSET_HOURS * 3600000,
      );
      const key = localDate.toISOString().slice(0, 10);
      const existing = map.get(key) ?? {
        total: 0,
        completed: 0,
        cancelled: 0,
      };
      existing.total++;
      if (appt.status === 'COMPLETED') existing.completed++;
      if (appt.status === 'CANCELLED') existing.cancelled++;
      map.set(key, existing);
    }

    return Array.from(map.entries())
      .map(([date, vals]) => ({ date, ...vals }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ── Appointments by status ────────────────────────────────────────────────

  private async getAppointmentsByStatus(
    from: Date,
    to: Date,
    doctorFilter: { doctorUserId?: string },
    clinicId?: string,
  ) {
    const where = this.buildWhereAppointment(from, to, doctorFilter, clinicId);

    const grouped = await this.prisma.appointment.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    return grouped.map((g) => ({
      status: g.status,
      count: g._count?._all ?? 0,
    }));
  }

  // ── Appointments by type ──────────────────────────────────────────────────

  private async getAppointmentsByType(
    from: Date,
    to: Date,
    doctorFilter: { doctorUserId?: string },
    clinicId?: string,
  ) {
    const where = this.buildWhereAppointment(from, to, doctorFilter, clinicId);

    const grouped = await this.prisma.appointment.groupBy({
      by: ['type'],
      where,
      _count: { _all: true },
    });

    return grouped.map((g) => ({
      type: g.type,
      count: g._count?._all ?? 0,
    }));
  }

  // ── Consultation KPIs ─────────────────────────────────────────────────────

  private async getConsultationKpis(
    from: Date,
    to: Date,
    doctorFilter: { doctorUserId?: string },
    clinicId?: string,
  ) {
    const where = this.buildWhereConsultation(from, to, doctorFilter, clinicId);
    const totalConsultations = await this.prisma.consultation.count({ where });
    return { totalConsultations };
  }

  // ── Consultations by type ─────────────────────────────────────────────────

  private async getConsultationsByType(
    from: Date,
    to: Date,
    doctorFilter: { doctorUserId?: string },
    clinicId?: string,
  ) {
    const where = this.buildWhereConsultation(from, to, doctorFilter, clinicId);

    const grouped = await this.prisma.consultation.groupBy({
      by: ['consultationType'],
      where,
      _count: { _all: true },
    });

    return grouped.map((g) => ({
      type: g.consultationType,
      count: g._count?._all ?? 0,
    }));
  }

  // ── Top diagnoses ─────────────────────────────────────────────────────────

  private async getTopDiagnoses(
    from: Date,
    to: Date,
    doctorFilter: { doctorUserId?: string },
    clinicId?: string,
  ) {
    const consultationWhere = this.buildWhereConsultation(
      from,
      to,
      doctorFilter,
      clinicId,
    );

    const grouped = await this.prisma.consultationDiagnosis.groupBy({
      by: ['description', 'icd10Code'],
      where: {
        consultation: consultationWhere,
        isMain: true,
      },
      _count: { _all: true },
      orderBy: {
        _count: {
          description: 'desc',
        },
      },
      take: 8,
    });

    return grouped.map((g) => ({
      description: g.description,
      icd10Code: g.icd10Code,
      count: g._count?._all ?? 0,
    }));
  }

  // ── Doctor performance ────────────────────────────────────────────────────

  private async getDoctorPerformance(from: Date, to: Date, clinicId?: string) {
    const where = this.buildWhereAppointment(from, to, {}, clinicId);

    const appointments = await this.prisma.appointment.findMany({
      where,
      select: {
        status: true,
        doctorClinic: {
          select: {
            doctorProfile: {
              select: {
                user: {
                  select: { firstName: true, lastNamePaternal: true },
                },
              },
            },
          },
        },
      },
    });

    const map = new Map<
      string,
      { name: string; total: number; completed: number; cancelled: number }
    >();

    for (const appt of appointments) {
      const user = appt.doctorClinic.doctorProfile.user;
      const name = `${user.firstName} ${user.lastNamePaternal}`;
      const existing = map.get(name) ?? {
        name,
        total: 0,
        completed: 0,
        cancelled: 0,
      };
      existing.total++;
      if (appt.status === 'COMPLETED') existing.completed++;
      if (appt.status === 'CANCELLED') existing.cancelled++;
      map.set(name, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }

  // ── Patients by gender ────────────────────────────────────────────────────

  private async getPatientsByGender() {
    const grouped = await this.prisma.patient.groupBy({
      by: ['gender'],
      where: { isActive: true },
      _count: { _all: true },
    });

    return grouped.map((g) => ({
      gender: g.gender,
      count: g._count?._all ?? 0,
    }));
  }

  // ── New patients in period ────────────────────────────────────────────────

  private async getNewPatients(from: Date, to: Date): Promise<number> {
    return this.prisma.patient.count({
      where: { createdAt: { gte: from, lte: to } },
    });
  }
}
