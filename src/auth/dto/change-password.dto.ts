import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$!%*?&]).{8,}$/, {
    message:
      'La contraseña debe incluir mayúscula, minúscula, número y carácter especial (@#$!%*?&)',
  })
  newPassword: string;
}
