import { ScheduleOverrideType } from '@generated/prisma/enums';
import {
  IsString,
  IsNotEmpty,
  Matches,
  IsOptional,
  IsEnum,
  IsDateString,
  ValidateIf,
} from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateScheduleOverrideDTO {
  @IsString()
  @IsNotEmpty({ message: 'El ID de la Clinica del doctor es obligatorio' })
  doctorClinicId: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsEnum(ScheduleOverrideType)
  type: ScheduleOverrideType;

  @ValidateIf(
    (o) =>
      o.type === ScheduleOverrideType.CUSTOM ||
      o.type === ScheduleOverrideType.AVAILABLE,
  )
  @IsNotEmpty({
    message: 'startTime es obligatorio para este tipo de excepción',
  })
  @Matches(TIME_REGEX, { message: 'startTime debe tener formato HH:MM' })
  startTime?: string;

  @ValidateIf(
    (o) =>
      o.type === ScheduleOverrideType.CUSTOM ||
      o.type === ScheduleOverrideType.AVAILABLE,
  )
  @IsNotEmpty({ message: 'endTime es obligatorio para este tipo de excepción' })
  @Matches(TIME_REGEX, { message: 'endTime debe tener formato HH:MM' })
  endTime?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
