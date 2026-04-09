import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  //   IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ValidationMessages } from 'src/common/validation/validation.messages';

/**
 * Campos editables del perfil médico.
 * Todos opcionales — se aplica patch parcial.
 * La firma digital se actualiza mediante el endpoint dedicado de upload.
 */
export class UpdateDoctorProfileDTO {
  // ── Dirección ─────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  address?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  numHome?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  colony?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  city?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  state?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  zipCode?: string;

  // ── Datos profesionales ───────────────────────────────────────────────────
  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  specialty?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  professionalLicense?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  university?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  @MaxLength(200)
  fullTitle?: string;

  // ── Configuración ─────────────────────────────────────────────────────────
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(120)
  defaultAppointmentDuration?: number;

  @IsOptional()
  @IsBoolean()
  canManageOwnSchedule?: boolean;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
