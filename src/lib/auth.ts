// Sesión de la aplicación. Solo Web Crypto, para que el middleware pueda verificarla sin
// depender de Node: el hash de la contraseña vive aparte, en auth-contrasena.ts.

const DURACION_SESION_HORAS = 12;

export const COOKIE_SESION = "om_sesion";

function aBase64Url(datos: ArrayBuffer): string {
  let binario = "";
  for (const byte of new Uint8Array(datos)) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function firmar(mensaje: string, secreto: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(mensaje));
  return aBase64Url(firma);
}

/** Crea el valor de la cookie: vencimiento firmado, sin datos del usuario dentro. */
export async function crearSesion(secreto: string): Promise<string> {
  const vence = Date.now() + DURACION_SESION_HORAS * 60 * 60 * 1000;
  const cuerpo = String(vence);
  return `${cuerpo}.${await firmar(cuerpo, secreto)}`;
}

/** Verifica firma y vencimiento. Se usa tanto en el servidor como en el middleware. */
export async function sesionValida(
  valor: string | undefined,
  secreto: string | undefined,
): Promise<boolean> {
  if (!valor || !secreto) return false;

  const separador = valor.lastIndexOf(".");
  if (separador <= 0) return false;

  const cuerpo = valor.slice(0, separador);
  const firma = valor.slice(separador + 1);
  if ((await firmar(cuerpo, secreto)) !== firma) return false;

  const vence = Number(cuerpo);
  return Number.isFinite(vence) && vence > Date.now();
}

export const SEGUNDOS_SESION = DURACION_SESION_HORAS * 60 * 60;
