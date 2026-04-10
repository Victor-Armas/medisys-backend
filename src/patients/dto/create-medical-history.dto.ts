import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { HabitStatus } from '@generated/prisma/enums';

export class CreateMedicalHistoryDTO {
  // ── Antecedentes patológicos ──────────────────────────────
  @IsOptional() @IsString() diseases?: string;
  @IsOptional() @IsString() surgeries?: string;
  @IsOptional() @IsString() hospitalizations?: string;
  @IsOptional() @IsBoolean() bloodTransfusions?: boolean;
  @IsOptional() @IsString() traumaHistory?: string;
  @IsOptional() @IsString() currentMedications?: string;
  @IsOptional() @IsString() allergies?: string;

  // ── Antecedentes no patológicos ───────────────────────────
  @IsOptional() @IsEnum(HabitStatus) smoking?: HabitStatus;
  @IsOptional() @IsString() smokingDetail?: string;
  @IsOptional() @IsEnum(HabitStatus) alcoholUse?: HabitStatus;
  @IsOptional() @IsString() alcoholDetail?: string;
  @IsOptional() @IsEnum(HabitStatus) drugUse?: HabitStatus;
  @IsOptional() @IsString() drugDetail?: string;
  @IsOptional() @IsString() immunizations?: string;
  @IsOptional() @IsString() physicalActivity?: string;
  @IsOptional() @IsBoolean() pets?: boolean;
  @IsOptional() @IsBoolean() tattoos?: boolean;
  @IsOptional() @IsBoolean() woodSmokeExposure?: boolean;

  // ── Heredofamiliares ──────────────────────────────────────
  @IsOptional() @IsString() fatherHistory?: string;
  @IsOptional() @IsString() motherHistory?: string;
  @IsOptional() @IsString() childrenHistory?: string;
  @IsOptional() @IsString() siblingsHistory?: string;
  @IsOptional() @IsString() otherFamilyHistory?: string;

  // ── Gineco-obstétricos ────────────────────────────────────
  @IsOptional() @IsInt() @Min(8) @Max(20) menarche?: number;
  @IsOptional() @IsString() menstrualCycle?: string;
  @IsOptional() @IsDateString() lastMenstrualPeriod?: string;
  @IsOptional() @IsInt() @Min(10) @Max(25) sexualActivityStart?: number;
  @IsOptional() @IsInt() @Min(0) gestations?: number;
  @IsOptional() @IsInt() @Min(0) deliveries?: number;
  @IsOptional() @IsInt() @Min(0) abortions?: number;
  @IsOptional() @IsInt() @Min(0) caesareans?: number;
  @IsOptional() @IsString() contraceptiveMethod?: string;
  @IsOptional() @IsBoolean() menopause?: boolean;
  @IsOptional() @IsString() mammography?: string;
  @IsOptional() @IsString() cervicalCytology?: string;
}
