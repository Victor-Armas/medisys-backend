import { Module } from '@nestjs/common';
// ConfigModule carga las variables de entorno del archivo .env
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';

// @Module() es el decorador raíz — NestJS arranca desde aquí
@Module({
  imports: [
    // isGlobal: true hace que las variables de entorno estén disponibles
    // en TODOS los módulos sin tener que importar ConfigModule en cada uno
    ConfigModule.forRoot({ isGlobal: true }),

    // Registramos el módulo de autenticación
    AuthModule,
  ],
})
export class AppModule {}
