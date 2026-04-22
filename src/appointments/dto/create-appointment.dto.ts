// src/appointments/dto/create-appointment.dto.ts

import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { AppointmentType } from '@generated/prisma/enums';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * DTO para crear una cita desde el panel de staff.
 * Trabaja con date + startTime separados para que el frontend
 * pueda usar DatePicker + TimePicker independientes.
 * La conversión a DateTime UTC ocurre en el service.
 */
export class CreateAppointmentDto {
  @IsUUID()
  @IsNotEmpty({ message: 'El DoctorClinic ID es obligatorio' })
  doctorClinicId: string;

  /** YYYY-MM-DD — se combina con startTime para formar el DateTime */
  @IsDateString({}, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  date: string;

  /** HH:MM en hora local del consultorio */
  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime debe tener formato HH:MM' })
  startTime: string;

  @IsEnum(AppointmentType, { message: 'Tipo de cita inválido' })
  type: AppointmentType;

  // ── Paciente registrado (opcional) ─────────────────────────────────────

  /** UUID del paciente si ya está en el sistema */
  @IsOptional()
  @IsUUID()
  patientId?: string;

  // ── Guest info — requerido solo cuando patientId es null ───────────────

  @IsOptional()
  @IsString()
  @MaxLength(200)
  guestName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  guestPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  guestEmail?: string;

  // ── Datos de la consulta ───────────────────────────────────────────────

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalNotes?: string;

  /** Solo requerido cuando type = HOME_VISIT */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  homeAddress?: string;
}
