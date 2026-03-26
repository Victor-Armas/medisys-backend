import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { ValidationMessages } from 'src/common/validation/validation.messages';

export class DoctorProfileBaseDTO {
  // Dirección personal
  @ApiProperty({ example: 'Av. Paseo de los Leones' })
  @IsString({ message: ValidationMessages.IS_STRING })
  @IsNotEmpty({ message: ValidationMessages.ADDRESS_REQUIRED })
  address: string;

  @ApiProperty({ example: '1205' })
  @IsString({ message: ValidationMessages.IS_STRING })
  @IsNotEmpty({ message: ValidationMessages.NUMHOME_REQUIRED })
  numHome: string;

  @ApiProperty({ example: 'Cumbres 3er Sector' })
  @IsString({ message: ValidationMessages.IS_STRING })
  @IsNotEmpty({ message: ValidationMessages.COLONY_REQUIRED })
  colony: string;

  @IsString({ message: ValidationMessages.IS_STRING })
  @IsNotEmpty({ message: ValidationMessages.CITY_REQUIRED })
  city: string;

  @IsString({ message: ValidationMessages.IS_STRING })
  @IsNotEmpty({ message: ValidationMessages.STATE_REQUIRED })
  state: string;

  @IsString({ message: ValidationMessages.IS_STRING })
  @IsNotEmpty({ message: ValidationMessages.ZIP_CODE_REQUIRED })
  zipCode: string;

  // Datos profesionales
  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  specialty?: string;

  @IsString({ message: ValidationMessages.IS_STRING })
  @IsNotEmpty({ message: ValidationMessages.PROFESSIONAL_LICENSE_REQUIRED })
  professionalLicense: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  university?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  fullTitle?: string;

  // Firma digital (opcional por ahora, puedes hacerlo obligatorio después)
  @IsOptional()
  @IsUrl({}, { message: ValidationMessages.SIGNATURE_URL })
  signatureUrl?: string;

  // === Consultorios (OPCIONAL al crear el doctor) ===
  @IsOptional()
  @IsArray({ message: ValidationMessages.CLINIC_IDS_ARRAY })
  @IsUUID('all', { each: true, message: ValidationMessages.CLINIC_IDS_INVALID })
  clinicIds?: string[];
}
