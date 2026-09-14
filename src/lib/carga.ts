// Reglas de la subida de documentos, compartidas entre el formulario y la acción de servidor.
// Viven fuera del archivo "use server" porque ese solo puede exportar funciones.

/**
 * Tiene que coincidir con `serverActions.bodySizeLimit` de next.config.ts: por encima de ese
 * tope la petición se rechaza antes de llegar al servidor y el usuario solo ve un error
 * genérico, sin saber que el problema era el peso del archivo.
 */
export const TAMANO_MAXIMO = 4 * 1024 * 1024;

export const TIPOS_ACEPTADOS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const ACEPTA = Object.keys(TIPOS_ACEPTADOS).join(",");

/**
 * Una meta en cero no es una meta de cero: es una meta que el sistema emisor no cargó. El
 * Resumen Ejecutivo de la cadena llega con la columna METAS en cero y VAR. METAS en -100 % para
 * todas las sucursales; tomarlo al pie de la letra pintaría de rojo el tablero entero el primer
 * día. Entra como faltante, el cumplimiento queda en blanco y el motor levanta una alerta.
 */
export function metaDeclarada(valor: number | null): number | null {
  return valor === 0 ? null : valor;
}
