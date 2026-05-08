import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class DashboardQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string; // YYYY-MM-DD  (default: inicio del mes actual)

  @IsOptional()
  @IsDateString()
  dateTo?: string; // YYYY-MM-DD  (default: hoy)

  @IsOptional()
  @IsUUID()
  clinicId?: string;

  @IsOptional()
  @IsUUID()
  doctorUserId?: string; // solo ADMIN puede filtrar por otro doctor
}
