import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilita CORS para que Next.js (puerto 3000) pueda llamar al backend (3001)
  // Sin esto el navegador bloquea las peticiones por seguridad
  app.enableCors({
    origin: 'http://localhost:3000',
  });

  // Prefijo global — todas las rutas quedan como /api/...
  // Ejemplo: /api/auth/login, /api/pacientes, etc.
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3001);
  console.log('Backend corriendo en http://localhost:3001/api');
}

bootstrap();
