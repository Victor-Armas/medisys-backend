import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ValidationMessages } from 'src/common/validation/validation.messages';

export class CreateClinicDTO {
  @ApiProperty({ example: 'Clínica Norte' })
  @IsString({ message: ValidationMessages.IS_STRING })
  @IsNotEmpty({ message: ValidationMessages.CLINIC_NAME_REQUIRED })
  name: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  phone?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  email?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  address?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  city?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  state?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  zipCode?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  rfc?: string;

  @IsOptional()
  @IsString({ message: ValidationMessages.IS_STRING })
  professionalLicense?: string;

  @IsOptional()
  @Matches(/^#([0-9A-Fa-f]{6})$/, {
    message: ValidationMessages.BRAND_COLOR_INVALID,
  })
  brandColor?: string;

  @IsOptional()
  @IsInt({ message: ValidationMessages.IS_STRING })
  @Min(1, { message: ValidationMessages.CLINIC_MAX_DOCTORS })
  @Max(20)
  maxDoctors?: number;
}
