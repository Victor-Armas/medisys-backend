// src/appointments/appointments.module.ts

import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { RolesGuard } from '@auth/guards/roles.guard';
import { ClinicsModule } from '../clinics/clinics.module';

/**
 * Módulo de citas para el panel de staff.
 *
 * Importa ClinicsModule para reutilizar getDoctorAvailability()
 * en la validación de slots al crear o editar citas.
 *
 * PrismaService viene de PrismaModule (@Global).
 */
@Module({
  imports: [ClinicsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, RolesGuard],
  exports: [AppointmentsService], // Exportar para uso futuro en ConsultationNotesModule
})
export class AppointmentsModule {}
