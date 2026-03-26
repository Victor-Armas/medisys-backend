import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ValidationMessages } from 'src/common/validation/validation.messages';

enum Role {
  ADMIN_SYSTEM = 'ADMIN_SYSTEM', // Administrador del sistema — acceso total a todos los consultorios
  MAIN_DOCTOR = 'MAIN_DOCTOR', // Médico principal — acceso total dentro de su(s) consultorio(s)
  DOCTOR = 'DOCTOR', // Médico — solo ve sus propios pacientes y citas
  RECEPTIONIST = 'RECEPTIONIST',
  PATIENT = 'PATIENT',
}

export class CreateUserDTO {
  @IsEmail({}, { message: ValidationMessages.IS_EMAIL })
  email: string;

  @IsString({ message: ValidationMessages.IS_STRING })
  @MinLength(8, { message: ValidationMessages.MIN_LENGTH(8) })
  password: string;

  @IsString({ message: ValidationMessages.IS_STRING })
  @IsNotEmpty({ message: ValidationMessages.FIRSTNAME_REQUIRED })
  firstName: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  middleName?: string;

  @IsString({ message: ValidationMessages.IS_STRING })
  @IsNotEmpty({ message: ValidationMessages.LASTNAMEPATERNAL_REQUIRED })
  lastNamePaternal: string;

  @IsString({ message: ValidationMessages.IS_STRING })
  @IsNotEmpty({ message: ValidationMessages.LASTNAMEMATERNAL_REQUIRED })
  lastNameMaternal: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  phone?: string;

  // El rol es opcional — si no se manda, Prisma usa el default (PATIENT)
  @IsOptional()
  @IsEnum(Role, { message: ValidationMessages.IS_ENUM })
  role?: Role;
}
