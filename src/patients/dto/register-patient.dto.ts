import { OmitType } from '@nestjs/swagger';
import { CreateUserDTO } from '@users/dto/create-user.dto';

// OmitType toma todo de CreateUserDTO pero ELIMINA el campo 'role'
export class RegisterPatientDTO extends OmitType(CreateUserDTO, [
  'role',
] as const) {
  // Es 100% seguro para el registro público
}
