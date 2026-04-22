// src/appointments/dto/update-appointment.dto.ts

import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAppointmentDto } from './create-appointment.dto';

/**
 * Para editar datos de la cita (cambiar hora, motivo, notas).
 * Omitimos doctorClinicId porque reasignar médico/consultorio
 * es una operación más compleja que requiere validar disponibilidad.
 */
export class UpdateAppointmentDto extends PartialType(
  OmitType(CreateAppointmentDto, ['doctorClinicId'] as const),
) {}
