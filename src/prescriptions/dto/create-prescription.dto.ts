// src/prescriptions/dto/create-prescription.dto.ts

import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Sub-DTO: Ítem de medicamento ──────────────────────────────────────────────

export class CreatePrescriptionItemDTO {
  // FK al catálogo (null si es medicamento libre)
  @IsOptional()
  @IsUUID()
  catalogId?: string;

  // FK al diagnóstico que lo origina (trazabilidad)
  @IsOptional()
  @IsUUID()
  consultationDiagnosisId?: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del medicamento es obligatorio' })
  @MaxLength(200)
  medicationName: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  brandName?: string;

  @IsString()
  @IsNotEmpty({ message: 'La dosis es obligatoria' })
  @MaxLength(100)
  dose: string;

  @IsString()
  @IsNotEmpty({ message: 'La frecuencia es obligatoria' })
  @MaxLength(200)
  frequency: string;

  @IsString()
  @IsNotEmpty({ message: 'La duración es obligatoria' })
  @MaxLength(200)
  duration: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  route?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instructions?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

// ── DTO principal ─────────────────────────────────────────────────────────────

export class CreatePrescriptionDTO {
  @IsUUID()
  @IsNotEmpty({ message: 'El ID de la consulta es obligatorio' })
  consultationId: string;

  @IsArray()
  @IsNotEmpty({ message: 'La receta debe tener al menos un medicamento' })
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDTO)
  items: CreatePrescriptionItemDTO[];
}
