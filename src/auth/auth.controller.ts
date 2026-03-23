import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

// @Controller('auth') significa que todas las rutas aquí empiezan con /auth
// Combinado con el prefijo global 'api' del main.ts → /api/auth
@Controller('auth')
export class AuthController {
  constructor(
    // NestJS inyecta AuthService automáticamente
    private authService: AuthService,
  ) {}

  /**
   * POST /api/auth/login
   * Recibe email y password, retorna JWT si son válidos
   *
   * Ejemplo de body:
   * {
   *   "email": "doctor@clinica.mx",
   *   "password": "Admin1234!"
   * }
   */
  @Post('login')
  login(
    // @Body() extrae el JSON del cuerpo de la petición
    @Body() body: { email: string; password: string },
  ) {
    // Delega toda la lógica al servicio
    // El controlador nunca debe tener lógica de negocio
    return this.authService.login(body.email, body.password);
  }
}
