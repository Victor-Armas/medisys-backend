import {
  IsInt,
  IsString,
  IsNotEmpty,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { ValidationMessages } from 'src/common/validation/validation.messages';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateScheduleDTO {
  @IsString()
  @IsNotEmpty()
  doctorClinicId: string;

  @IsInt({ message: ValidationMessages.WEEKDAY_INVALID })
  @Min(0, { message: ValidationMessages.WEEKDAY_INVALID })
  @Max(6, { message: ValidationMessages.WEEKDAY_INVALID })
  weekDay: number;

  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime debe tener formato HH:MM' })
  startTime: string;

  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime debe tener formato HH:MM' })
  endTime: string;
}
