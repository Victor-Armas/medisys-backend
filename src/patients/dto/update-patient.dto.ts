import { PartialType, OmitType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreatePatientDTO } from './create-patient.dto';

// Todos los campos de CreatePatientDTO son opcionales en la edición.
// Omitimos clinicId porque la asignación a clínicas tiene su propio endpoint.
export class UpdatePatientDTO extends PartialType(
  OmitType(CreatePatientDTO, ['clinicId'] as const),
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
