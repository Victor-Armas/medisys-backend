// src/clinics/dto/update-schedule-range.dto.ts
import {
  IsString,
  IsOptional,
  Matches,
  IsDateString,
  IsBoolean,
} from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdateScheduleRangeDTO {
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime debe tener formato HH:MM' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime debe tener formato HH:MM' })
  endTime?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
