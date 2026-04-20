import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { HabitStatus } from '@generated/prisma/enums';

/**
 * DTO for creating/updating MedicalHistory.
 *
 * Note: pathological antecedents (diseases, surgeries, hospitalizations,
 * traumatismos, currentMedications, allergies, heredofamiliares) have been
 * migrated to structured models:
 *   - PatientCondition  (POST /patients/:id/conditions)
 *   - PatientMedication (POST /patients/:id/medications)
 *   - PatientAllergy    (POST /patients/:id/allergies)
 *
 * This DTO now covers only: habits and gynecological antecedents.
 */
export class CreateMedicalHistoryDTO {
  // ── Remaining pathological fact ───────────────────────────
  @IsOptional() @IsBoolean() bloodTransfusions?: boolean;

  // ── Non-pathological habits ───────────────────────────────
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

  // ── Gynecological / obstetric ─────────────────────────────
  @IsOptional() @IsInt() @Min(0) menarche?: number;
  @IsOptional() @IsString() menstrualCycle?: string;
  @IsOptional() @IsDateString() lastMenstrualPeriod?: string;
  @IsOptional() @IsInt() @Min(0) sexualActivityStart?: number;
  @IsOptional() @IsInt() @Min(0) gestations?: number;
  @IsOptional() @IsInt() @Min(0) deliveries?: number;
  @IsOptional() @IsInt() @Min(0) abortions?: number;
  @IsOptional() @IsInt() @Min(0) caesareans?: number;
  @IsOptional() @IsString() contraceptiveMethod?: string;
  @IsOptional() @IsBoolean() menopause?: boolean;
  @IsOptional() @IsString() mammography?: string;
  @IsOptional() @IsString() cervicalCytology?: string;
}
