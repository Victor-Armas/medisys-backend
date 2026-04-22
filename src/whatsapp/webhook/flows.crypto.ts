// src/whatsapp/webhook/flows.crypto.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// ── Contratos de la API de Meta ────────────────────────────────────────────

/** Payload cifrado que Meta envía al endpoint de Data Exchange */
export interface WhatsAppFlowEncryptedRequest {
  encrypted_flow_data: string; // Datos de la pantalla cifrados con AES-128-GCM
  encrypted_aes_key: string; // Llave AES cifrada con nuestra RSA pública
  initial_vector: string; // IV en Base64 para AES-GCM
}

/** Cuerpo descifrado de una interacción de Flow */
export interface FlowBody {
  version: string;
  action: 'ping' | 'INIT' | 'data_exchange' | 'BACK';
  screen: string;
  data: Record<string, unknown>;
}

/** Resultado de descifrar: incluye el body Y la llave AES ya lista */
export interface DecryptedPayload {
  body: FlowBody;
  /** Llave AES-128 descifrada — reusar en encryptResponse para no descifrar dos veces */
  aesKey: Buffer;
  /** IV original — encryptResponse lo flipea internamente (byte ^ 0xFF) */
  iv: Buffer;
}

// ────────────────────────────────────────────────────────────────────────────

@Injectable()
export class FlowsCryptoService {
  private readonly privateKey: string;

  constructor(private readonly configService: ConfigService) {
    const raw = this.configService.get<string>('WHATSAPP_FLOWS_PRIVATE_KEY');
    if (!raw) {
      throw new Error(
        '❌ FATAL: WHATSAPP_FLOWS_PRIVATE_KEY no está en el .env',
      );
    }
    // Normalizar: el .env puede guardar los saltos como \n literales
    this.privateKey = raw.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
  }

  // ── DESCIFRADO ──────────────────────────────────────────────────────────

  /**
   * Convierte el payload cifrado de Meta en datos legibles.
   *
   * Algoritmo:
   *   1. Descifrar `encrypted_aes_key` con RSA-OAEP-SHA256 usando nuestra private key
   *   2. Descifrar `encrypted_data` con AES-128-GCM usando la llave AES del paso 1
   *   3. Los últimos 16 bytes de `encrypted_data` son el Auth Tag de GCM
   *
   * Devuelve el body YA parseado + la llave AES en Buffer para reutilizarla
   * en `encryptResponse` sin necesidad de descifrar RSA una segunda vez.
   */
  decryptRequest(payload: WhatsAppFlowEncryptedRequest): DecryptedPayload {
    const { encrypted_flow_data, encrypted_aes_key, initial_vector } = payload;

    try {
      // Paso 1: RSA-OAEP → llave AES en claro
      const aesKey = crypto.privateDecrypt(
        {
          key: this.privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(encrypted_aes_key, 'base64'),
      );

      const iv = Buffer.from(initial_vector, 'base64');
      const ciphertext = Buffer.from(encrypted_flow_data, 'base64');

      // Paso 2: Separar auth tag (últimos 16 bytes) del contenido cifrado
      const authTag = ciphertext.subarray(ciphertext.length - 16);
      const content = ciphertext.subarray(0, ciphertext.length - 16);

      // Paso 3: AES-128-GCM descifrado
      const decipher = crypto.createDecipheriv('aes-128-gcm', aesKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(content),
        decipher.final(),
      ]);

      return {
        body: JSON.parse(decrypted.toString('utf8')) as FlowBody,
        aesKey, // ← Reutilizar en encryptResponse, ya descifrada
        iv, // ← IV original; encryptResponse lo flipea internamente
      };
    } catch (err) {
      console.error('❌ Error descifrado Flow:', err);
      throw new InternalServerErrorException(
        'No se pudo descifrar la petición de WhatsApp',
      );
    }
  }

  // ── CIFRADO ─────────────────────────────────────────────────────────────

  /**
   * Cifra la respuesta de tu backend para que Meta y el celular del paciente
   * puedan leerla.
   *
   * CRÍTICO — IV Flip:
   *   Meta exige que la respuesta use el mismo AES key PERO con el IV invertido:
   *   cada byte del IV original se hace XOR con 0xFF.
   *   Sin este flip, Meta rechazará la respuesta silenciosamente.
   *
   * @param response - El objeto JSON que quieres enviar de vuelta (screen + data)
   * @param aesKey   - La llave AES ya descifrada que te devolvió decryptRequest
   * @param iv       - El IV original de la petición (se flipea aquí internamente)
   * @returns Base64 de (ciphertext + authTag), listo para enviar a Meta
   */
  encryptResponse(
    response: Record<string, unknown>,
    aesKey: Buffer,
    iv: Buffer,
  ): string {
    try {
      // ← FIX CRÍTICO: Meta exige el IV flippeado (XOR 0xFF en cada byte)
      const flippedIv = Buffer.from(iv.map((byte) => byte ^ 0xff));

      const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, flippedIv);

      const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(response), 'utf8'),
        cipher.final(),
      ]);

      // Auth tag de GCM — Meta lo necesita al final del buffer
      const authTag = cipher.getAuthTag();

      return Buffer.concat([encrypted, authTag]).toString('base64');
    } catch (err) {
      console.error('❌ Error cifrado respuesta Flow:', err);
      throw new InternalServerErrorException(
        'Error al cifrar la respuesta para WhatsApp',
      );
    }
  }
}
