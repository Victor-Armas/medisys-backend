import { PartialType } from '@nestjs/swagger';
import { CreateClinicDTO } from './create-clinic.dto';

export class UpdateClinicDTO extends PartialType(CreateClinicDTO) {}
