// src/whatsapp/flows/flows.controller.ts

import {
  Body,
  Controller,
  ForbiddenException,
  Header,
  HttpCode,
  Post,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { WhatsAppFlowEncryptedRequest } from '../webhook/flows.crypto';
import { FlowsService } from './flows.service';

/**
 * Endpoint de Data Exchange para WhatsApp Flows.
 *
 * CONFIGURACIÓN REQUERIDA EN META PORTAL:
 *   WhatsApp > Flows > Medisys_Citas > Configuración > Endpoint de la API de datos
 *   URL: https://<tu-ngrok>.ngrok-free.dev/api/whatsapp/flows/exchange
 *
 * Este endpoint es DIFERENTE al webhook:
 *   - /webhook → recibe eventos normales de WhatsApp (mensajes, estados)
 *   - /flows/exchange → Meta llama aquí en cada interacción del usuario con el Flow
 *
 * @SkipThrottle porque Meta puede llamarlo en ráfagas durante una sesión del Flow
 */
@SkipThrottle()
@Controller('whatsapp/flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  /**
   * POST /api/whatsapp/flows/exchange
   *
   * Meta envía el payload CIFRADO con AES-128-GCM + RSA-OAEP.
   * Respondemos con el payload cifrado de la siguiente pantalla.
   * Tiempo máximo de respuesta: 1 segundo (límite estricto de Meta).
   */
  @Post('exchange')
  @HttpCode(200)
  @Header('Content-Type', 'text/plain')
  async exchange(@Body() body: WhatsAppFlowEncryptedRequest): Promise<string> {
    if (
      !body?.encrypted_flow_data ||
      !body?.encrypted_aes_key ||
      !body?.initial_vector
    ) {
      throw new ForbiddenException('Payload de Flow inválido o incompleto');
    }

    return this.flowsService.handleExchange(body);
  }
}
