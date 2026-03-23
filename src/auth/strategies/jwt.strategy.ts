import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

// Este interface describe lo que "viene dentro" de un JWT válido.
// Debe coincidir exactamente con el payload que firmas en AuthService.login()
export interface JwtPayload {
  sub: string; // ID del usuario (estándar JWT)
  email: string;
  role: string;
  name: string;
}

// PassportStrategy(Strategy) conecta la librería passport-jwt con NestJS.
// El string 'jwt' es el nombre de esta estrategia — el Guard la buscará por este nombre.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      // Lee el token del header: Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Si el token expiró, Passport lanza 401 automáticamente
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  // validate() se ejecuta DESPUÉS de que Passport verifica la firma del token.
  // Lo que retornas aquí se convierte en req.user en tus controladores.
  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    };
  }
}
