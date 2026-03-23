import { IsEmail, IsString, MinLength } from 'class-validator';

// DTO = Data Transfer Object.
// Define exactamente qué forma deben tener los datos que llegan al endpoint.
// Los decoradores de class-validator describen las reglas de validación.
// El ValidationPipe global (que agregamos en main.ts) las ejecuta automáticamente.
export class LoginDto {
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'El password debe tener al menos 8 caracteres' })
  password: string;
}
