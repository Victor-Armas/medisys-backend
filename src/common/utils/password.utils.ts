import { randomInt } from 'crypto';

// Grupos de caracteres separados para garantizar al menos uno de cada tipo
const CHAR_GROUPS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '@#$!%*?&',
} as const;

const ALL_CHARS = Object.values(CHAR_GROUPS).join('');

/**
 * Genera una contraseña criptográficamente segura.
 * Garantiza: mínimo 2 de cada grupo + longitud total configurable.
 * Usa `crypto.randomInt` en lugar de Math.random (criptográficamente seguro).
 */
export function generateSecurePassword(length = 12): string {
  if (length < 8) throw new Error('La longitud mínima es 8 caracteres');

  // 1. Garantizar al menos 2 caracteres de cada grupo (8 chars obligatorios)
  const requiredChars = Object.values(CHAR_GROUPS).flatMap((group) => [
    pickRandom(group),
    pickRandom(group),
  ]);

  // 2. Rellenar el resto con cualquier carácter
  const fillCount = length - requiredChars.length;
  const fillChars = Array.from({ length: fillCount }, () =>
    pickRandom(ALL_CHARS),
  );

  // 3. Mezclar para que los chars requeridos no estén siempre al inicio
  return secureShuffle([...requiredChars, ...fillChars]).join('');
}

function pickRandom(chars: string): string {
  return chars[randomInt(chars.length)];
}

// Fisher-Yates con randomInt — sin sesgo
function secureShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
