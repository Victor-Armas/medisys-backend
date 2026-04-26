// src/medical-catalog/dto/create-suggestion.dto.ts

import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSuggestionDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  icd10Code: string;

  @IsUUID()
  @IsNotEmpty()
  medicationCatalogId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  defaultDose?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  defaultFrequency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  defaultDuration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  defaultRoute?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  priority?: number;
}
