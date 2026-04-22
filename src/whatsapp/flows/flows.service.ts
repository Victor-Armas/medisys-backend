// src/whatsapp/flows/flows.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClinicsService } from '../../clinics/clinics.service';
import {
  FlowsCryptoService,
  WhatsAppFlowEncryptedRequest,
} from '../webhook/flows.crypto';

// ── Constantes — IDs de pantalla del Flow JSON ─────────────────────────────
// Deben coincidir EXACTAMENTE con los "id" de screens en el JSON de Meta
const SCREEN = {
  APPOINTMENT: 'APPOINTMENT', // Pantalla 1: seleccionar consultorio + fecha
  DETAILS: 'DETAILS', // Pantalla 2: seleccionar horario
  SUMMARY: 'SUMMARY', // Pantalla 3: datos del paciente
  SUCCESS: 'SUCCESS', // Pantalla 4: confirmación (terminal)
} as const;

// ── Timezone del consultorio ────────────────────────────────────────────────
// México / Monterrey = UTC-6 (CST)
// TODO: Migrar a luxon o date-fns-tz para manejo automático de DST
const CLINIC_TZ_HOURS_BEHIND_UTC = 6;

// ── Tipos del payload del Flow ─────────────────────────────────────────────
interface FlowScreenData {
  action?: string; // Para identificar: fetch_doctors | fetch_dates | fetch_slots
  // APPOINTMENT screen
  clinic_id?: string;
  doctor_id?: string;
  appointment_date?: string; // YYYY-MM-DD — viene del DatePicker

  // DETAILS screen (pasado desde APPOINTMENT via navigate)
  doctor_clinic_id?: string;
  date_display?: string;
  time_slot?: string; // HH:MM — el usuario lo elige

  // SUMMARY screen — datos del paciente
  patient_name?: string;
  patient_phone?: string;
  reason?: string;
}

type FlowAction = 'ping' | 'INIT' | 'data_exchange';

interface FlowDecryptedBody {
  action: FlowAction;
  screen: string;
  version: string;
  data: FlowScreenData;
}

// ────────────────────────────────────────────────────────────────────────────

@Injectable()
export class FlowsService {
  private readonly logger = new Logger(FlowsService.name);

  constructor(
    private readonly prisma: PrismaService, // @Global(), disponible sin importar
    private readonly cryptoService: FlowsCryptoService,
    private readonly clinicsService: ClinicsService, // Reutilizamos getDoctorAvailability()
  ) {}

  // ── Punto de entrada principal ────────────────────────────────────────────

  /**
   * Orquesta el ciclo completo de una interacción:
   *   1. Descifra la petición de Meta
   *   2. Enruta según action + screen
   *   3. Cifra y devuelve la respuesta
   *
   * El try/catch externo garantiza que siempre devolvemos una respuesta cifrada,
   * incluso en errores inesperados (Meta falla silenciosamente si no recibe respuesta).
   */
  async handleExchange(payload: WhatsAppFlowEncryptedRequest): Promise<string> {
    let aesKey: Buffer | undefined;
    let iv: Buffer | undefined;
    let decryptedBody: FlowDecryptedBody | undefined;

    try {
      // 🔐 1. decrypt request
      const decrypted = this.cryptoService.decryptRequest(payload);

      aesKey = decrypted.aesKey;
      iv = decrypted.iv;

      // 👇 ahora ya es seguro tiparlo
      decryptedBody = decrypted.body as FlowDecryptedBody;

      const { action, screen, data, version } = decryptedBody;

      this.logger.log(`Flow → action: ${action} | screen: ${screen}`);

      let responsePayload: Record<string, unknown>;

      // ─────────────────────────────────────────────
      // 🔀 ROUTING PRINCIPAL
      // ─────────────────────────────────────────────

      if (action === 'ping') {
        responsePayload = {
          version,
          data: { status: 'active' },
        };
      } else if (action === 'INIT') {
        responsePayload = await this.handleInit(version);
      } else if (action === 'data_exchange') {
        responsePayload = await this.handleDataExchange(screen, data, version);
      } else {
        responsePayload = {
          version,
          data: { error_message: 'Acción no soportada' },
        };
      }

      // ✅ respuesta exitosa cifrada
      return this.cryptoService.encryptResponse(responsePayload, aesKey, iv);
    } catch (err) {
      this.logger.error('Error procesando Flow exchange', err);

      // ─────────────────────────────────────────────
      // 🚨 CASO 1: no hay llaves → no se puede cifrar
      // ─────────────────────────────────────────────
      if (!aesKey || !iv) {
        throw err;
      }

      // ─────────────────────────────────────────────
      // ⚠️ CASO 2: error de lógica → sí se puede cifrar
      // ─────────────────────────────────────────────
      const errorPayload = {
        version: decryptedBody?.version ?? '3.0',
        data: {
          error_message: 'Ocurrió un error interno. Intenta nuevamente.',
        },
      };

      return this.cryptoService.encryptResponse(errorPayload, aesKey, iv);
    }
  }

  // ── Manejadores por acción ────────────────────────────────────────────────

  /**
   * INIT — El usuario abre el Flow.
   * Cargamos la lista de consultorios activos para el Dropdown de pantalla 1.
   */
  private async handleInit(version: string): Promise<Record<string, unknown>> {
    // 1. Obtener clínicas activas
    const clinicsFromDb = await this.prisma.clinic.findMany({
      where: {
        isActive: true,
        doctorClinics: {
          some: {
            isActive: true,
          },
        },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    // 2. Formatear estrictamente: solo id y title
    const clinics = clinicsFromDb.map((c) => ({
      id: c.id,
      title: c.name,
    }));

    return {
      version,
      screen: SCREEN.APPOINTMENT,
      data: {
        clinics, // Arreglo limpio de objetos {id, title}
        doctors: [], // Inicialmente vacío
      },
    };
  }
  /**
   * DATA_EXCHANGE — El usuario presionó un botón de acción.
   * Enrutamos según la pantalla activa.
   */
  private async handleDataExchange(
    screen: string,
    data: FlowScreenData,
    version: string,
  ): Promise<Record<string, unknown>> {
    switch (screen) {
      case SCREEN.APPOINTMENT:
        return this.handleAppointmentExchange(data, version);

      case SCREEN.SUMMARY:
        return this.handleSummaryExchange(data, version);

      default:
        this.logger.warn(`data_exchange en pantalla no manejada: ${screen}`);
        return {
          version,
          data: { error_message: `Pantalla desconocida: ${screen}` },
        };
    }
  }

  // ── Pantalla APPOINTMENT → devuelve horarios disponibles para DETAILS ────

  /**
   * El usuario seleccionó consultorio y fecha.
   * Buscamos al médico del consultorio y calculamos los slots disponibles
   * filtrando los que ya están ocupados con citas activas.
   */
  private async handleAppointmentExchange(
    data: FlowScreenData & { selected_date?: string },
    version: string,
  ): Promise<Record<string, unknown>> {
    // 1. Extraemos TODO lo que Meta puede mandarnos (normalizando nombres)
    const { action, clinic_id } = data;
    const doctor_clinic_id = data.doctor_clinic_id || data.doctor_id;
    const appointment_date = data.appointment_date || data.selected_date;

    this.logger.log(
      `Exchange APPOINTMENT -> action: ${action}, doctor: ${doctor_clinic_id}, date: ${appointment_date}`,
    );

    // ─────────────────────────────────────────────────────────────────
    // PRIORIDAD 1: FETCH SLOTS (El usuario dio clic al botón del Footer)
    // ─────────────────────────────────────────────────────────────────
    // Si tenemos acción de slots O si ya tenemos doctor y fecha, queremos cambiar de pantalla
    if (action === 'fetch_slots' || (doctor_clinic_id && appointment_date)) {
      if (!appointment_date || !doctor_clinic_id) {
        return this.buildDetailsError(
          version,
          appointment_date,
          'Faltan datos por seleccionar.',
          doctor_clinic_id || '',
        );
      }

      const availability = await this.clinicsService.getDoctorAvailability(
        doctor_clinic_id,
        { dateFrom: appointment_date, dateTo: appointment_date },
      );

      const allSlots: string[] = availability[appointment_date] ?? [];

      if (allSlots.length === 0) {
        return this.buildDetailsError(
          version,
          appointment_date,
          'No hay horarios disponibles.',
          doctor_clinic_id,
        );
      }

      const bookedSlots = await this.getBookedSlotsForDate(
        doctor_clinic_id,
        appointment_date,
      );
      const freeSlots = allSlots.filter((slot) => !bookedSlots.includes(slot));

      if (freeSlots.length === 0) {
        return this.buildDetailsError(
          version,
          appointment_date,
          'Agenda llena para este día.',
          doctor_clinic_id,
        );
      }
      const dateDisplay = this.formatDateDisplay(appointment_date);
      const summary_header = `¡Excelente! Nos encantará recibirte el ${dateDisplay} ✨`;
      // ✅ CAMBIO DE PANTALLA: Mandamos a DETAILS
      return {
        version,
        screen: SCREEN.DETAILS,
        data: {
          available_slots: freeSlots.map((slot) => ({
            id: slot,
            title: this.formatTimeDisplay(slot),
          })),
          doctor_clinic_id,
          clinic_id, // 👈 Importante pasarlo para el Summary después
          appointment_date,
          date_display: this.formatDateDisplay(appointment_date),
          summary_header,
          error_message: '',
        },
      };
    }

    // ─────────────────────────────────────────────────────────────────
    // PRIORIDAD 2: FETCH DATES (Seleccionó Doctor)
    // ─────────────────────────────────────────────────────────────────
    if (action === 'fetch_dates' || (doctor_clinic_id && !appointment_date)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const availability = await this.clinicsService.getDoctorAvailability(
        doctor_clinic_id!,
        {
          dateFrom: this.toISODate(tomorrow),
          dateTo: this.toISODate(nextMonth),
        },
      );

      const available_dates: { id: string; title: string }[] = [];
      for (const [dateStr, slots] of Object.entries(availability)) {
        if (slots.length > 0) {
          available_dates.push({
            id: dateStr,
            title: this.formatDateDisplay(dateStr),
          });
        }
      }

      const clinicsFromDb = await this.prisma.clinic.findMany({
        where: { isActive: true, doctorClinics: { some: { isActive: true } } },
        select: { id: true, name: true },
      });

      const doctorClinics = await this.prisma.doctorClinic.findMany({
        where: { clinicId: clinic_id, isActive: true },
        include: { doctorProfile: { include: { user: true } } },
      });

      return {
        version,
        screen: SCREEN.APPOINTMENT,
        data: {
          clinics: clinicsFromDb.map((c) => ({ id: c.id, title: c.name })),
          doctors: doctorClinics.map((dc) => ({
            id: dc.id,
            title: `Dr. ${dc.doctorProfile.user.firstName} ${dc.doctorProfile.user.lastNamePaternal}`,
          })),
          available_dates,
        },
      };
    }

    // ─────────────────────────────────────────────────────────────────
    // PRIORIDAD 3: FETCH DOCTORS (Seleccionó Clínica)
    // ─────────────────────────────────────────────────────────────────
    if (action === 'fetch_doctors' || (clinic_id && !doctor_clinic_id)) {
      const doctorClinics = await this.prisma.doctorClinic.findMany({
        where: { clinicId: clinic_id, isActive: true },
        include: { doctorProfile: { include: { user: true } } },
      });

      const clinicsFromDb = await this.prisma.clinic.findMany({
        where: { isActive: true, doctorClinics: { some: { isActive: true } } },
        select: { id: true, name: true },
      });

      return {
        version,
        screen: SCREEN.APPOINTMENT,
        data: {
          clinics: clinicsFromDb.map((c) => ({ id: c.id, title: c.name })),
          doctors: doctorClinics.map((dc) => ({
            id: dc.id,
            title: `Dr. ${dc.doctorProfile.user.firstName} ${dc.doctorProfile.user.lastNamePaternal}`,
          })),
          available_dates: [],
        },
      };
    }

    // Fallback por si borra la clínica
    return this.handleInit(version);
  }
  // ── Pantalla SUMMARY → crea la cita y devuelve SUCCESS ───────────────────

  /**
   * El usuario ingresó sus datos y confirmó.
   * Creamos el Appointment en la base de datos.
   *
   * NOTA: La creación directa desde PrismaService aquí es intencional para el MVP.
   * TODO: Mover a AppointmentsService cuando se cree ese módulo en Fase 3.
   */
  private async handleSummaryExchange(
    data: FlowScreenData,
    version: string,
  ): Promise<Record<string, unknown>> {
    const {
      doctor_clinic_id,
      appointment_date,
      time_slot,
      patient_name,
      patient_phone,
      reason,
    } = data;

    // 1. Validación de seguridad (con un toque de amabilidad)
    if (
      !doctor_clinic_id ||
      !appointment_date ||
      !time_slot ||
      !patient_name ||
      !patient_phone
    ) {
      return {
        version,
        screen: SCREEN.SUMMARY,
        data: {
          ...data,
          error_message:
            '¡Ups! Parece que nos faltó algún datito importante para asegurar tu lugar. ¿Podrías revisarlo? 🩹',
        },
      };
    }

    try {
      // 2. Calculamos los tiempos (UTC-6)
      const startTime = this.toUtcDateTime(appointment_date, time_slot);

      const doctorClinic = await this.prisma.doctorClinic.findUnique({
        where: { id: doctor_clinic_id },
        include: {
          doctorProfile: { select: { defaultAppointmentDuration: true } },
        },
      });

      const duration =
        doctorClinic?.doctorProfile?.defaultAppointmentDuration ?? 30;
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

      // 3. CREAMOS LA CITA EN PRISMA 🚀
      const appointment = await this.prisma.appointment.create({
        data: {
          doctorClinicId: doctor_clinic_id,
          guestName: patient_name.trim(),
          guestPhone: patient_phone.trim(),
          reason: reason?.trim() || null,
          type: 'IN_PERSON',
          status: 'PENDING',
          bookedVia: 'WHATSAPP',
          startTime,
          endTime,
        },
      });

      this.logger.log(`✅ Cita confirmada exitosamente: ${appointment.id}`);

      const dateDisplay = this.formatDateDisplay(appointment_date);
      const timeDisplay = this.formatTimeDisplay(time_slot);

      // 4. Respondemos con calidez y alegría 🌟
      return {
        version,
        screen: SCREEN.SUCCESS,
        data: {
          confirmation_text:
            `¡Qué alegría, ${patient_name}! 🎉\n\n` +
            `Tu lugar ya está apartado para el día **${dateDisplay}** a las **${timeDisplay}**.\n\n` +
            `Todo nuestro equipo ya se está preparando para recibirte y cuidarte como mereces. ✨🏥`,
        },
      };
    } catch (error) {
      this.logger.error('Error al crear la cita:', error);
      return {
        version,
        screen: SCREEN.SUMMARY,
        data: {
          ...data,
          error_message:
            '¡Uy! Tuvimos un pequeño tropiezo técnico al intentar guardar tu cita. 🩹 No te preocupes, ¡intenta una vez más! ✨',
        },
      };
    }
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  /** Construye la respuesta de error para la pantalla DETAILS */
  private buildDetailsError(
    version: string,
    appointment_date: string | undefined,
    errorMsg: string,
    doctorClinicId = '',
  ): Record<string, unknown> {
    return {
      version,
      screen: SCREEN.DETAILS,
      data: {
        available_slots: [],
        error_message: errorMsg,
        doctor_clinic_id: doctorClinicId,
        appointment_date: appointment_date ?? '',
        date_display: appointment_date
          ? this.formatDateDisplay(appointment_date)
          : '',
      },
    };
  }

  /**
   * Devuelve los slots HH:MM ya ocupados para un médico en una fecha.
   * Excluye citas canceladas y no-shows.
   */
  private async getBookedSlotsForDate(
    doctorClinicId: string,
    date: string,
  ): Promise<string[]> {
    // Rango del día completo en UTC (sumamos 1 día para el límite superior)
    const dayStart = this.toUtcDateTime(date, '00:00');
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const booked = await this.prisma.appointment.findMany({
      where: {
        doctorClinicId,
        startTime: { gte: dayStart, lt: dayEnd },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { startTime: true },
    });

    // Convertir cada DateTime UTC de vuelta al HH:MM del consultorio
    return booked.map((a) => this.utcToClinicTimeString(a.startTime));
  }

  /**
   * Convierte "2026-04-21" + "09:00" → DateTime UTC.
   * Los horarios del consultorio están en CST (UTC-6).
   * El sufijo -06:00 hace la conversión correcta: 09:00-06:00 = 15:00Z
   *
   * TODO: Cuando haya citas en otros estados (ej. CDMX = UTC-5 en verano),
   *       usar luxon: DateTime.fromISO(`${date}T${time}`, { zone: 'America/Monterrey' }).toJSDate()
   */
  private toUtcDateTime(date: string, time: string): Date {
    return new Date(`${date}T${time}:00-06:00`);
  }

  /** Convierte un DateTime UTC al HH:MM local del consultorio (UTC-6) */
  private utcToClinicTimeString(utcDate: Date): string {
    // local = UTC - 6 horas
    const localMs =
      utcDate.getTime() - CLINIC_TZ_HOURS_BEHIND_UTC * 60 * 60 * 1000;
    const local = new Date(localMs);
    const hh = local.getUTCHours().toString().padStart(2, '0');
    const mm = local.getUTCMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }

  /** Date → "YYYY-MM-DD" */
  private toISODate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /** "2026-04-21" → "martes 21 de abril de 2026" */
  private formatDateDisplay(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(
      'es-MX',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      },
    );
  }

  /** "09:00" → "9:00 AM" */
  private formatTimeDisplay(timeStr: string): string {
    const [h, m] = timeStr.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
  }
}
