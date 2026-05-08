import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    // NestJS inyecta estas dependencias automáticamente
    // No necesitamos hacer "new UsersService()" manualmente
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * Valida email y password, y retorna un JWT si son correctos
   *
   * Flujo:
   * 1. Busca el usuario por email
   * 2. Verifica que el usuario exista y esté activo
   * 3. Compara el password con el hash guardado en DB
   * 4. Genera y retorna el JWT con los datos del usuario
   */
  // Actualizar el método login para incluir mustChangePassword en la respuesta:
  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) throw new UnauthorizedException('Cuenta Inexistente');

    const passwordValido = await bcrypt.compare(password, user.password);
    if (!passwordValido) throw new UnauthorizedException('Password Incorrecto');

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Tu cuenta está desactivada. Por favor, contacta al administrador',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastNamePaternal: user.lastNamePaternal,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        firstName: user.firstName,
        lastNamePaternal: user.lastNamePaternal,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword, // ← nuevo
      },
    };
  }

  /**
   * Permite al usuario autenticado cambiar su propia contraseña.
   * Limpia el flag mustChangePassword al completarse.
   */
  async changePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashedPassword);
  }
}
