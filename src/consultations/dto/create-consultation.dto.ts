// src/consultations/dto/create-consultation.dto.ts

import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsArray,
  ValidateNested,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ConsultationType,
  DiagnosisType,
  Gender,
} from '@generated/prisma/enums';
import { PartialType, PickType } from '@nestjs/swagger';
import { CreatePatientDTO } from 'src/patients/dto/create-patient.dto';

// ── Sub-DTO: Diagnóstico inline ───────────────────────────────────────────────

export class CreateDiagnosisDTO {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  icd10Code?: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción del diagnóstico es obligatoria' })
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsEnum(DiagnosisType)
  diagnosisType?: DiagnosisType;

  @IsOptional()
  @IsBoolean()
  isMain?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

// ── Sub-DTO: Signos vitales inline ────────────────────────────────────────────

export class CreateVitalSignsDTO {
  @IsOptional()
  weightKg?: number;

  @IsOptional()
  heightCm?: number;

  @IsOptional()
  bmi?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bloodPressure?: string; // "120/80"

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(300)
  heartRateBpm?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60)
  respiratoryRate?: number;

  @IsOptional()
  temperatureC?: number;

  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(100)
  oxygenSaturation?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  glucoseMgdl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePatientInlineDTO extends PartialType(
  PickType(CreatePatientDTO, [
    'firstName',
    'middleName',
    'lastNamePaternal',
    'lastNameMaternal',
    'birthDate',
    'gender',
    'phone',
  ] as const),
) {
  // 🔒 Reforzar obligatorios reales del modelo
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastNamePaternal: string;

  @IsDateString()
  birthDate: string;

  @IsEnum(Gender)
  gender: Gender;
}

// ── DTO principal ─────────────────────────────────────────────────────────────

export class CreateConsultationDTO {
  // Relación con la cita (opcional — puede haber consulta sin cita previa)
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ValidateIf((o) => !o.patientId)
  @ValidateNested()
  @Type(() => CreatePatientInlineDTO)
  patient?: CreatePatientInlineDTO;

  @IsUUID()
  @IsNotEmpty({ message: 'El médico/consultorio es obligatorio' })
  doctorClinicId: string;

  @IsOptional()
  @IsEnum(ConsultationType)
  consultationType?: ConsultationType;

  // ── Sección I: Motivo y padecimiento ───────────────────────────────────────
  @IsString()
  @IsNotEmpty({ message: 'El motivo de consulta es obligatorio' })
  reasonForVisit: string;

  @IsString()
  @IsNotEmpty({ message: 'El padecimiento actual es obligatorio' })
  currentCondition: string;

  // ── Sección II: Exploración física ─────────────────────────────────────────
  @IsOptional()
  @IsString()
  physicalExamFindings?: string;

  // ── Sección III: Estudios auxiliares ───────────────────────────────────────
  @IsOptional()
  @IsString()
  labResultsSummary?: string;

  // ── Sección IV: Diagnóstico ─────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  clinicalImpressions?: string;

  // ── Sección V: Tratamiento ──────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @IsOptional()
  @IsString()
  patientInstructions?: string;

  // ── Sección VI: Pronóstico ──────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  prognosis?: string;

  // ── Seguimiento ─────────────────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  requiresFollowUp?: boolean;

  @IsOptional()
  @IsInt()
  followUpDays?: number;

  @IsOptional()
  @IsString()
  followUpNotes?: string;

  // ── Sub-documentos ───────────────────────────────────────────────────────────
  // Los signos vitales se crean junto con la consulta (una sola llamada)
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateVitalSignsDTO)
  vitalSigns?: CreateVitalSignsDTO;

  // Los diagnósticos se crean junto con la consulta
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDiagnosisDTO)
  diagnoses?: CreateDiagnosisDTO[];
}
