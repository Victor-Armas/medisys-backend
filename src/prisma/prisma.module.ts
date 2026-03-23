import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() hace que PrismaService esté disponible en toda la app
// sin necesidad de importar PrismaModule en cada módulo que lo use.
// Sin @Global() tendrías que hacer imports: [PrismaModule] en UsersModule,
// en un futuro PacientesModule, en CitasModule, etc. — innecesario para infraestructura.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
