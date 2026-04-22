// src/whatsapp/webhook/webhook.controller.ts

import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Logger,
  Post,
  Query,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { WebhookService } from './webhook.service';

/**
 * Receptor de eventos normales de WhatsApp Cloud API.
 *
 * Este endpoint recibe:
 *   - Actualizaciones de estado de mensajes (enviado, entregado, leído)
 *   - Mensajes entrantes de texto (si el paciente escribe directamente)
 *   - Notificaciones de Flow completado
 *
 * NOTA: El Data Exchange del Flow va a /api/whatsapp/flows/exchange (FlowsController).
 */
@SkipThrottle()
@Controller('whatsapp/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET — Handshake inicial de Meta.
   * Meta llama esto una sola vez cuando configuras el webhook en el portal.
   */
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    if (!mode || !token || !challenge) {
      throw new ForbiddenException('Faltan parámetros de verificación');
    }
    return this.webhookService.verifyWebhook(mode, token, challenge);
  }

  /**
   * POST — Eventos entrantes de WhatsApp.
   *
   * Valida la firma HMAC-SHA256 (X-Hub-Signature-256) antes de procesar.
   * Meta firma cada request con el App Secret para prevenir spoofing.
   * Requiere rawBody: true en main.ts para poder validar la firma.
   */
  @Post()
  handleEvent(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: unknown,
  ): void {
    // Validar firma HMAC si tenemos el App Secret configurado
    const appSecret = this.configService.get<string>('WHATSAPP_APP_SECRET');
    if (appSecret && req.rawBody) {
      this.validateHmacSignature(req.rawBody, signature, appSecret);
    } else if (!appSecret) {
      this.logger.warn(
        '⚠️  WHATSAPP_APP_SECRET no configurado — saltando validación HMAC',
      );
    }

    this.webhookService.handleIncomingEvent(body);
  }

  /** Verifica que la firma X-Hub-Signature-256 sea válida */
  private validateHmacSignature(
    rawBody: Buffer,
    signature: string,
    appSecret: string,
  ): void {
    if (!signature?.startsWith('sha256=')) {
      throw new ForbiddenException('Firma HMAC ausente o mal formada');
    }

    const expected =
      'sha256=' +
      crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

    // Comparación de tiempo constante para prevenir timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );

    if (!isValid) {
      this.logger.error('❌ Firma HMAC inválida — posible request falso');
      throw new ForbiddenException('Firma de webhook inválida');
    }
  }
}
