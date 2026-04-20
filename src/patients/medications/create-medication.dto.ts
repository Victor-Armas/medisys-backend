// ─── src/patients/medications/dto/create-medication.dto.ts ───────────────────
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateMedicationDTO {
  /** FK to MedicationCatalog — null when isNonCoded = true */
  @IsOptional()
  @IsUUID()
  catalogId?: string;

  /** Always stored to survive catalog changes. */
  @IsString()
  @IsNotEmpty({ message: 'El nombre del medicamento es obligatorio' })
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  dose?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  frequency?: string;

  /** true when no catalog match exists. */
  @IsOptional()
  @IsBoolean()
  isNonCoded?: boolean;
}

export class UpdateMedicationDTO {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dose?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  frequency?: string;
}
