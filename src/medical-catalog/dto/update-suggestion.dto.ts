// src/medical-catalog/dto/update-suggestion.dto.ts

import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateSuggestionDTO {
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

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
