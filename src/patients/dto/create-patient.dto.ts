import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  BloodType,
  EducationLevel,
  Gender,
  MaritalStatus,
} from '@generated/prisma/enums';

// CURP: 18 caracteres, formato oficial RENAPO
const CURP_REGEX =
  /^[A-Z]{1}[AEIOU]{1}[A-Z]{2}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|1[0-9]|2[0-9]|3[0-1])[HM]{1}(AS|BC|BS|CC|CS|CH|CL|CM|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]{1}[0-9]{1}$/;

export class CreatePatientDTO {
  // ── Nombre ────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100)
  firstName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido paterno es obligatorio' })
  @MaxLength(100)
  lastNamePaternal: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastNameMaternal?: string;

  // ── Datos demográficos ────────────────────────────────────
  @IsDateString(
    {},
    {
      message: 'La fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD)',
    },
  )
  birthDate: string;

  @IsEnum(Gender, { message: 'El género debe ser MALE, FEMALE u OTHER' })
  gender: Gender;

  @IsOptional()
  @Matches(CURP_REGEX, { message: 'El CURP no tiene un formato válido' })
  curp?: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @MaxLength(20)
  phone: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  email?: string;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupation?: string;

  @IsOptional()
  @IsEnum(EducationLevel)
  educationLevel?: EducationLevel;

  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType;

  // ── Contacto de emergencia ────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(200)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContactRelation?: string;

  // ── Clínica de registro ───────────────────────────────────
  // Opcional: si se pasa, crea el vínculo PatientClinic
  @IsOptional()
  @IsString()
  clinicId?: string;
}
