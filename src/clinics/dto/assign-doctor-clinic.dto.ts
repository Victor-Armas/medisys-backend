import { IsBoolean, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AssignDoctorToClinicDTO {
  @IsUUID()
  @IsNotEmpty({ message: 'El ID del perfil médico es obligatorio' })
  doctorProfileId: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
