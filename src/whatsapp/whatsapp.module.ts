// src/whatsapp/whatsapp.module.ts

import { Module } from '@nestjs/common';
import { WebhookController } from './webhook/webhook.controller';
import { WebhookService } from './webhook/webhook.service';
import { FlowsCryptoService } from './webhook/flows.crypto';
import { FlowsController } from './flows/flows.controller';
import { FlowsService } from './flows/flows.service';
import { MessagingService } from './messaging/messaging.service';
import { ClinicsModule } from '../clinics/clinics.module';

/**
 * Módulo de WhatsApp — agrupa todo lo relacionado con la integración de WA.
 *
 * Importa ClinicsModule para poder usar ClinicsService en FlowsService:
 *   - findAllPublic()           → lista de consultorios para el Dropdown
 *   - getDoctorAvailability()   → slots disponibles por fecha
 *
 * PrismaService viene de PrismaModule (@Global) — no necesita importarse.
 */
@Module({
  imports: [
    ClinicsModule, // Necesario para inyectar ClinicsService en FlowsService
  ],
  controllers: [
    WebhookController, // GET+POST /api/whatsapp/webhook
    FlowsController, // POST /api/whatsapp/flows/exchange
  ],
  providers: [
    WebhookService, // Verifica webhook + maneja eventos normales
    FlowsService, // Lógica de pantallas del Flow
    FlowsCryptoService, // Cifrado/descifrado RSA+AES
    MessagingService, // Envío de mensajes salientes
  ],
  exports: [MessagingService], // Exportar por si otros módulos necesitan enviar mensajes
})
export class WhatsappModule {}
