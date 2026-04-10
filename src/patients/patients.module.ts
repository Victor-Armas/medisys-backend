import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { RolesGuard } from '@auth/guards/roles.guard';

@Module({
  controllers: [PatientsController],
  providers: [PatientsService, RolesGuard],
  exports: [PatientsService], // AppointmentsModule lo usará en Fase 3
})
export class PatientsModule {}
