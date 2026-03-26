import { IsNotEmpty, IsUUID } from 'class-validator';
import { DoctorProfileBaseDTO } from './doctor-profile-base.dto';

export class AssignDoctorProfileDTO extends DoctorProfileBaseDTO {
  @IsNotEmpty({ message: 'El ID del usuario es obligatorio' })
  @IsUUID()
  userId: string;
}
