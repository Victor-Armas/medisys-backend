import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AllergySeverity } from '@generated/prisma/enums';

export class CreateAllergyDTO {
  @IsString()
  @IsNotEmpty({ message: 'La sustancia alérgena es obligatoria' })
  @MaxLength(200)
  substance: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reaction?: string;

  @IsOptional()
  @IsEnum(AllergySeverity)
  severity?: AllergySeverity;
}
