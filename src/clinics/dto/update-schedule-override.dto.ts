// src/clinics/dto/update-schedule-override.dto.ts
import {
  IsString,
  IsOptional,
  Matches,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ScheduleOverrideType } from '@generated/prisma/enums';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdateScheduleOverrideDTO {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(ScheduleOverrideType)
  type?: ScheduleOverrideType;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime debe tener formato HH:MM' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime debe tener formato HH:MM' })
  endTime?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
