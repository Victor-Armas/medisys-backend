import { IntersectionType } from '@nestjs/swagger';
import { CreateUserDTO } from '../../users/dto/create-user.dto';
import { DoctorProfileBaseDTO } from './doctor-profile-base.dto';

// Combina Email/Pass/Name + Datos Médicos en un solo esquema de Swagger
export class CreateDoctorDTO extends IntersectionType(
  CreateUserDTO,
  DoctorProfileBaseDTO,
) {}
