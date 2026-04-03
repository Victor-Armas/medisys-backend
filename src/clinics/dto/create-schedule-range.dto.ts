import {
  IsString,
  IsNotEmpty,
  Matches,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateScheduleRangeDTO {
  @IsString()
  @IsNotEmpty()
  doctorClinicId: string;

  @IsInt()
  @Min(0)
  @Max(6)
  weekDay: number;

  @IsString()
  @Matches(TIME_REGEX, {
    message: 'startTime debe tener formato HH:MM',
  })
  startTime: string;

  @IsString()
  @Matches(TIME_REGEX, {
    message: 'endTime debe tener formato HH:MM',
  })
  endTime: string;

  @IsDateString()
  dateFrom: string;

  @IsDateString()
  dateTo: string;
}
