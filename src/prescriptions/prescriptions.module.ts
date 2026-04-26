// src/prescriptions/prescriptions.module.ts

import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { RolesGuard } from '@auth/guards/roles.guard';

/**
 * Módulo de recetas médicas (Fase 4/5).
 *
 * PrismaService → @Global (no se importa)
 * CloudinaryService → @Global (no se importa)
 */
@Module({
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, RolesGuard],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
