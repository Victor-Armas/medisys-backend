// src/whatsapp/webhook/webhook.service.ts

import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagingService } from '../messaging/messaging.service';

/**
 * Maneja la verificación del webhook y los eventos normales de WhatsApp.
 *
 * Responsabilidad única: eventos de mensajes y estado.
 * El Data Exchange del Flow es responsabilidad de FlowsService.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private configService: ConfigService,
    private messagingService: MessagingService,
  ) {}

  // ── Verificación inicial ──────────────────────────────────────────────────

  /**
   * Valida el handshake de Meta.
   * Devuelve el challenge como string plano (sin JSON — Meta lo requiere así).
   */
  verifyWebhook(mode: string, token: string, challenge: string): string {
    const verifyToken = this.configService.get<string>(
      'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
    );

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('✅ Webhook verificado por Meta');
      return challenge;
    }

    this.logger.error('❌ Verificación fallida — token no coincide');
    throw new ForbiddenException('Token de verificación inválido');
  }

  // ── Eventos entrantes ─────────────────────────────────────────────────────

  /**
   * Procesa eventos normales del webhook de WhatsApp.
   * Enruta según el tipo: mensajes de texto, actualizaciones de estado, etc.
   *
   * Estructura del payload de Meta:
   * {
   *   object: "whatsapp_business_account",
   *   entry: [{ id, changes: [{ value: { ... }, field: "messages" }] }]
   * }
   */
  handleIncomingEvent(payload: unknown): void {
    const body = payload as Record<string, unknown>;

    if (body?.object !== 'whatsapp_business_account') {
      this.logger.debug('Evento ignorado — no es de whatsapp_business_account');
      return;
    }

    const entries = (body?.entry as Array<unknown>) ?? [];

    for (const entry of entries) {
      const changes =
        ((entry as Record<string, unknown>)?.changes as Array<unknown>) ?? [];

      for (const change of changes) {
        const value = (change as Record<string, unknown>)?.value as Record<
          string,
          unknown
        >;
        if (!value) continue;

        // Procesar mensajes entrantes (el paciente escribe directamente)
        const messages = value.messages as
          | Array<Record<string, unknown>>
          | undefined;
        if (messages?.length) {
          for (const msg of messages) {
            this.handleMessage(msg);
          }
        }

        // Procesar actualizaciones de estado (enviado, entregado, leído, fallido)
        const statuses = value.statuses as
          | Array<Record<string, unknown>>
          | undefined;
        if (statuses?.length) {
          for (const status of statuses) {
            this.handleStatusUpdate(status);
          }
        }
      }
    }
  }

  /** Maneja un mensaje de texto entrante */
  private handleMessage(msg: Record<string, unknown>): void {
    let from = msg.from as string;

    if (from.startsWith('521') && from.length === 13) {
      from = from.replace('521', '52');
    }

    const type = msg.type as string;

    if (type === 'text') {
      const text = (msg.text as Record<string, unknown>)?.body as string;
      this.logger.log(`💬 Mensaje de ${from}: "${text}"`);

      // 👇 PASO 0: Disparador Inteligente
      // Evaluamos si es un saludo, o si es un mensaje muy corto (típico de primer contacto)
      const textLower = text.toLowerCase();
      const isGreeting = [
        'hola',
        'buenas',
        'buenos',
        'info',
        'cita',
        'agendar',
        'hello',
      ].some((word) => textLower.includes(word));

      // Si es un saludo, o es un texto de menos de 15 caracteres (ej. "quiero informes")
      if (isGreeting || text.length < 15) {
        this.messagingService.sendWelcomeMenuWithFlow(from).catch((err) => {
          this.logger.error(
            `Error disparando el flow de bienvenida para ${from}`,
            err,
          );
        });
      } else {
        // Opcional: Aquí podrías manejar mensajes largos que no sean saludos.
        // Por ahora, para asegurarnos de que siempre puedan agendar, podemos dispararlo siempre.
        this.messagingService.sendWelcomeMenuWithFlow(from).catch((err) => {
          this.logger.error(
            `Error disparando el flow de bienvenida para ${from}`,
            err,
          );
        });
      }
    } else if (type === 'interactive') {
      this.logger.log(`🔘 Interacción de ${from}: tipo ${type}`);
    } else {
      this.logger.debug(`Tipo de mensaje no manejado: ${type} de ${from}`);
    }
  }
  /** Maneja actualizaciones de estado de mensajes enviados */
  private handleStatusUpdate(status: Record<string, unknown>): void {
    const id = status.id as string;
    const statusStr = status.status as string;
    // sent | delivered | read | failed
    this.logger.debug(`📊 Estado de mensaje ${id}: ${statusStr}`);
    // TODO: Actualizar en DB si rastreamos el status de mensajes enviados
  }
}
