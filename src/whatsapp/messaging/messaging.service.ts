// src/whatsapp/messaging/messaging.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Servicio para enviar mensajes salientes a través de la WhatsApp Cloud API.
 * Actualmente envía mensajes de texto simples (no requieren aprobación de Meta).
 * TODO: Migrar a mensajes de plantilla (template) para notificaciones confiables.
 */
@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly baseUrl: string;
  private readonly accessToken: string;

  constructor(private readonly configService: ConfigService) {
    const phoneNumberId = this.configService.get<string>(
      'WHATSAPP_PHONE_NUMBER_ID',
    );
    this.accessToken =
      this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') ?? '';
    this.baseUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  }

  /**
   * Envía un mensaje de texto plano a un número de WhatsApp.
   * El número debe incluir el código de país sin el signo +
   * Ejemplo: "528112345678" para un número de Monterrey.
   */
  async sendTextMessage(to: string, text: string): Promise<void> {
    try {
      await axios.post(
        this.baseUrl,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: false, body: text },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`✉️  Mensaje enviado a ${to}`);
    } catch (err) {
      // No lanzamos excepción — fallar el envío no debe romper el flujo principal
      this.logger.error(`Error enviando mensaje a ${to}:`, err);
    }
  }

  async sendWelcomeMenuWithFlow(to: string): Promise<void> {
    const flowToken = `phone_${to}`;
    try {
      await axios.post(
        this.baseUrl,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'interactive',
          interactive: {
            type: 'flow',
            body: {
              text: '👋 ¡Bienvenido!\n\nAgenda tu cita de forma rápida y segura desde aquí:',
            },
            action: {
              name: 'flow',
              parameters: {
                mode: 'draft', // Mantenemos draft porque no lo has publicado
                flow_message_version: '3',
                flow_token: flowToken,
                flow_id: '2184005005471199',
                flow_cta: 'Agendar Cita',
              },
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`📱 Flow de citas enviado exitosamente a ${to}`);
    } catch (err: any) {
      this.logger.error(
        `❌ Error enviando Flow a ${to}:`,
        err.response?.data || err.message,
      );
    }
  }

  /**
   * Envía la confirmación de cita al paciente.
   * @param phone - Número sin +, con código de país (ej: "528181234567")
   */
  async sendAppointmentConfirmation(
    phone: string,
    name: string,
    dateDisplay: string,
    timeDisplay: string,
  ): Promise<void> {
    const msg =
      `✅ *Cita confirmada, ${name}*\n\n` +
      `📅 Fecha: ${dateDisplay}\n` +
      `🕐 Hora: ${timeDisplay}\n\n` +
      `Si necesitas cancelar o reagendar, responde a este mensaje.`;

    await this.sendTextMessage(phone, msg);
  }
}
