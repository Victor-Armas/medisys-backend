import { Role } from '@generated/prisma/enums';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ValidationMessages } from 'src/common/validation/validation.messages';

/**
 * Campos editables de un User existente.
 * El email NO es editable para evitar colisiones y mantener trazabilidad.
 * El password tiene su propio flujo de reset.
 */
export class UpdateUserDTO {
  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  @MaxLength(100)
  middleName?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  @MaxLength(100)
  lastNamePaternal?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  @MaxLength(100)
  lastNameMaternal?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  phone?: string;

  @IsOptional()
  @IsEnum(Role, { message: ValidationMessages.IS_ENUM })
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
