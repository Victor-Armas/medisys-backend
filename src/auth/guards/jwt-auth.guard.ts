import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// AuthGuard('jwt') le dice a Passport: "usa la estrategia llamada 'jwt'".
// Al decorar una ruta con @UseGuards(JwtAuthGuard), NestJS intercepta
// el request, ejecuta la JwtStrategy, y solo pasa al handler si el token es válido.
// Si no hay token o es inválido → 401 Unauthorized automático, tu código no se toca.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
