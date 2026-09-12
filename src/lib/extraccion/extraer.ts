import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  ExtraccionAjustes,
  ExtraccionVentas,
  type ExtraccionAjustesTipo,
  type ExtraccionVentasTipo,
} from "./esquemas";

// Única salida a internet de la aplicación: se envía el archivo a leer y nada más.
// La clave es del usuario y vive solo en el servidor.

export const MODELO = "claude-opus-5";

export function hayClaveIA() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const REGLAS_COMUNES = `Lees tableros operativos de una cadena retail venezolana y devuelves sus cifras estructuradas.

Reglas que no se negocian:
- Transcribes, no interpretas. Si una celda no se lee con certeza, va como null. Nunca completes, estimes ni deduzcas un número que no esté impreso.
- El nombre de cada tienda va exactamente como aparece en el documento, sin corregir ni normalizar.
- Los subtotales por zona y el total de la cadena NO son tiendas. Jamás los mezcles con las filas de tienda.
- Formato numérico latino: "1.234,56" significa 1234.56 y "1.234" significa 1234. Devuelve siempre números planos, sin separadores ni símbolos.
- Los porcentajes van como número: 30,5 % se devuelve como 30.5.
- Toda ambigüedad, celda borrosa, fila cortada o encabezado dudoso se anota en observaciones. Es preferible una observación de más que un dato equivocado.`;

type ArchivoEntrada = { datos: string; tipoMime: string };

function bloqueDocumento(archivo: ArchivoEntrada): Anthropic.ContentBlockParam {
  if (archivo.tipoMime === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: archivo.datos },
    };
  }
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: archivo.tipoMime as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
      data: archivo.datos,
    },
  };
}

async function pedirExtraccion<T>(
  archivo: ArchivoEntrada,
  sistema: string,
  instruccion: string,
  formato: ReturnType<typeof zodOutputFormat>,
): Promise<T> {
  const cliente = new Anthropic();

  const respuesta = await cliente.messages.parse({
    model: MODELO,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: sistema,
    messages: [
      {
        role: "user",
        content: [bloqueDocumento(archivo), { type: "text", text: instruccion }],
      },
    ],
    output_config: { format: formato },
  });

  if (!respuesta.parsed_output) {
    throw new Error("El modelo no devolvió una lectura utilizable del documento.");
  }
  return respuesta.parsed_output as T;
}

/**
 * Traduce los fallos de la API a algo accionable. El error crudo llega en inglés y con JSON
 * dentro, y en esta pantalla lo único que necesita saber una persona es qué tiene que arreglar.
 */
export function explicarFalloIA(error: unknown): string {
  const crudo = error instanceof Error ? error.message : String(error);

  if (/authentication_error|invalid x-api-key|API key is invalid|\b401\b/i.test(crudo)) {
    return "La clave de Anthropic no es válida. Revísala en las variables de entorno y vuelve a desplegar.";
  }
  if (/credit balance|insufficient|quota/i.test(crudo)) {
    return "La cuenta de Anthropic no tiene saldo. Recárgala y vuelve a intentarlo.";
  }
  if (/rate_limit|\b429\b/i.test(crudo)) {
    return "Demasiadas peticiones seguidas. Espera un momento y vuelve a intentarlo.";
  }
  if (/overloaded|\b529\b|\b503\b/i.test(crudo)) {
    return "El servicio está saturado en este momento. Vuelve a intentarlo en unos minutos.";
  }
  if (/timeout|ETIMEDOUT|ECONNRESET|fetch failed/i.test(crudo)) {
    return "Se cortó la conexión con el servicio. Vuelve a intentarlo; si el documento es muy pesado, sube solo la página del tablero.";
  }
  return crudo;
}

export async function extraerVentas(archivo: ArchivoEntrada): Promise<ExtraccionVentasTipo> {
  return pedirExtraccion<ExtraccionVentasTipo>(
    archivo,
    REGLAS_COMUNES,
    `Este documento es un Dashboard Ejecutivo de ventas por tienda. Extrae una fila por tienda con Ventas $, Unidades, Transacciones y %MB, separando meta de real según los encabezados. Si el documento solo trae el valor real de algún indicador, deja la meta en null.`,
    zodOutputFormat(ExtraccionVentas),
  );
}

export async function extraerAjustes(archivo: ArchivoEntrada): Promise<ExtraccionAjustesTipo> {
  return pedirExtraccion<ExtraccionAjustesTipo>(
    archivo,
    REGLAS_COMUNES,
    `Este documento es un reporte de ajustes por tipología de una cadena de supermercados. Extrae una fila por sucursal con las cinco tipologías —Merma, Mercancía Dañada, Carga y Descarga, Inventario y Ventas— respetando el signo tal como aparece impreso: los ajustes en contra van en negativo. Las filas de zona y el total de cadena son subtotales, no sucursales. Indica en "unidad" si las cifras son montos en $ o porcentajes sobre ventas.`,
    zodOutputFormat(ExtraccionAjustes),
  );
}
