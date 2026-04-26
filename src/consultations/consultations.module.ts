// src/consultations/consultations.module.ts

import { Module } from '@nestjs/common';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';
import { RolesGuard } from '@auth/guards/roles.guard';

/**
 * Módulo de consultas médicas (Fase 4 — Expediente clínico).
 *
 * PrismaService viene de PrismaModule (@Global) — no se importa aquí.
 * PrescriptionsModule se importa para que el service de recetas pueda
 * ser usado desde aquí si se requiere (ej: generar receta al cerrar consulta).
 */
@Module({
  controllers: [ConsultationsController],
  providers: [ConsultationsService, RolesGuard],
  exports: [ConsultationsService], // Exportado para PrescriptionsModule
})
export class ConsultationsModule {}
