// src/consultations/dto/update-consultation.dto.ts

import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateConsultationDTO } from './create-consultation.dto';

/**
 * Para editar una consulta en progreso.
 * Omitimos patientId y doctorClinicId — no se pueden cambiar.
 * appointmentId tampoco: la vinculación con la cita es permanente.
 */
export class UpdateConsultationDTO extends PartialType(
  OmitType(CreateConsultationDTO, [
    'patientId',
    'doctorClinicId',
    'appointmentId',
  ] as const),
) {}
