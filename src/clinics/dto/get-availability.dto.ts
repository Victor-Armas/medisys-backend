import { IsDateString, IsNotEmpty } from 'class-validator';

export class GetAvailabilityDto {
  @IsNotEmpty()
  @IsDateString()
  dateFrom: string;

  @IsNotEmpty()
  @IsDateString()
  dateTo: string;
}
