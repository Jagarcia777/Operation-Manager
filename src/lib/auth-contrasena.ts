import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Hash de la contraseña con scrypt, que viene en Node y no necesita módulos nativos.
// Vive separado de la sesión porque el middleware no puede cargar node:crypto.

/**
 * Genera el valor que se guarda en APP_PASSWORD_HASH. Formato: scrypt:sal:derivada.
 * El separador es ":" y no "$" porque en un archivo .env el símbolo de dólar se interpreta
 * como referencia a otra variable y el hash llegaría mutilado.
 */
export function generarHash(contrasena: string): string {
  const sal = randomBytes(16).toString("hex");
  const derivada = scryptSync(contrasena, sal, 64).toString("hex");
  return `scrypt:${sal}:${derivada}`;
}

export function verificarContrasena(contrasena: string, hashGuardado: string): boolean {
  const [algoritmo, sal, derivadaEsperada] = hashGuardado.split(":");
  if (algoritmo !== "scrypt" || !sal || !derivadaEsperada) return false;

  const derivada = scryptSync(contrasena, sal, 64);
  const esperada = Buffer.from(derivadaEsperada, "hex");
  if (derivada.length !== esperada.length) return false;
  return timingSafeEqual(derivada, esperada);
}
