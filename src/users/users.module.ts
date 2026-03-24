import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RolesGuard } from '@auth/guards/roles.guard';

@Module({
  controllers: [UsersController],
  // providers: servicios que este módulo crea y administra
  providers: [UsersService, RolesGuard],

  // exports: lo que este módulo comparte con otros módulos
  // Sin esto, AuthModule no podría usar UsersService
  exports: [UsersService],
})
export class UsersModule {}

/*Con esto el flujo completo queda así cuando alguien llama `POST /api/users`:
Request
  → JwtAuthGuard     ¿token válido?                            → 401 si no
  → RolesGuard       ¿es ADMIN_SISTEMA o   ADMIN_CONSULTORIO?  → 403 si no
                     
  → ValidationPipe   ¿body correcto?                           → 400 si no
  → UsersService     ¿email ya existe?                         → 409 si sí
  → Prisma           crea usuario                              → 201 con datos 
  */
