import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

enum Role {
  ADMIN_SISTEMA = 'ADMIN_SISTEMA',
  ADMIN_CONSULTORIO = 'ADMIN_CONSULTORIO',
  DOCTOR = 'DOCTOR',
  RECEPCIONISTA = 'RECEPCIONISTA',
}

export class CreateUserDTO {
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'El password debe de tener minimo 8 caracteres' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  // El rol es opcional — si no se manda, Prisma usa el default (RECEPCIONISTA)
  @IsOptional()
  @IsEnum(Role, { message: 'El rol no es válido' })
  role?: Role;
}
