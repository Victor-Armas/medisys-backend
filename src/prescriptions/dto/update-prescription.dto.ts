// src/prescriptions/dto/update-prescription.dto.ts

import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePrescriptionItemDTO } from './create-prescription.dto';

/**
 * Solo se pueden editar los ítems mientras la receta esté en DRAFT.
 * Reemplaza TODOS los ítems (estrategia replace-all para simplicidad).
 */
export class UpdatePrescriptionDTO {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDTO)
  items?: CreatePrescriptionItemDTO[];
}
