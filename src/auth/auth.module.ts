import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    // UsersModule para poder usar UsersService dentro de AuthService
    UsersModule,

    // JwtModule.registerAsync() configura el JWT de forma asíncrona
    // porque necesita leer variables de entorno del ConfigService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        // La clave secreta con la que se firman los tokens
        // Si alguien la conoce puede generar tokens falsos — guárdala bien
        secret: config.get('JWT_SECRET'),
        signOptions: {
          // El token expira en 7 días — después el usuario debe volver a loguearse
          expiresIn: config.get('JWT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
  ],

  // Este controlador maneja las rutas de /api/auth
  controllers: [AuthController],

  // AuthService contiene la lógica del login
  providers: [AuthService],
})
export class AuthModule {}
