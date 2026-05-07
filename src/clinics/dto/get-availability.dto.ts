import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class GetAvailabilityDto {
  @IsNotEmpty()
  @IsDateString()
  dateFrom: string;

  @IsNotEmpty()
  @IsDateString()
  dateTo: string;

  @IsOptional()
  @IsUUID()
  excludeAppointmentId?: string;
}
