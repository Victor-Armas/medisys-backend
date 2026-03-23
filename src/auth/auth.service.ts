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
  async login(email: string, password: string) {
    // Paso 1: buscar usuario
    const user = await this.usersService.findByEmail(email);

    // Paso 2: verificar que existe y está activo
    // Usamos el mismo mensaje para ambos casos por seguridad
    // (no queremos revelar si el email existe o no)
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Paso 3: comparar password con hash
    // bcrypt.compare() hashea el password recibido y lo compara con el guardado
    const passwordValido = await bcrypt.compare(password, user.password);
    if (!passwordValido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Paso 4: crear el payload del JWT
    // Esto es lo que quedará "dentro" del token — no pongas info sensible aquí
    const payload = {
      sub: user.id, // "sub" es el estándar JWT para el ID del usuario
      email: user.email,
      role: user.role,
      name: user.name,
    };

    return {
      // jwtService.sign() firma el payload y genera el token
      access_token: this.jwtService.sign(payload),
      // También retornamos datos básicos del usuario para el frontend
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
