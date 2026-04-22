// src/appointments/dto/list-appointments.dto.ts

import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentStatus } from '@generated/prisma/enums';

/**
 * Query params para filtrar la lista/calendario de citas.
 * Todos los campos son opcionales — sin filtros devuelve todo (paginado).
 */
export class ListAppointmentsDto {
  /** Filtrar por médico específico (su userId, no el doctorProfileId) */
  @IsOptional()
  @IsUUID()
  doctorUserId?: string;

  /** Filtrar por consultorio */
  @IsOptional()
  @IsUUID()
  clinicId?: string;

  /** Inicio del rango de fechas — YYYY-MM-DD */
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  /** Fin del rango de fechas — YYYY-MM-DD */
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  /** Filtrar por estado */
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 50;
}
