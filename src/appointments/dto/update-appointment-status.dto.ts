// src/appointments/dto/update-appointment-status.dto.ts

import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AppointmentStatus } from '@generated/prisma/enums';

/**
 * DTO exclusivo para cambiar el estado de una cita.
 * Separado del UpdateAppointmentDto para poder tener
 * lógica de transición de estados centralizada en el service.
 */
export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus, { message: 'Estado de cita inválido' })
  status: AppointmentStatus;

  /** Motivo de cancelación o nota al cambiar estado (opcional) */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
