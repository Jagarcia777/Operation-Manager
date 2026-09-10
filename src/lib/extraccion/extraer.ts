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
    `Este documento es un reporte de ajustes por tipología. Extrae una fila por tienda con Merma, Mercancía Dañada, Carga y Descarga, Inventario y Errores de Venta, e indica en "unidad" si las cifras impresas son montos en $ o porcentajes sobre ventas.`,
    zodOutputFormat(ExtraccionAjustes),
  );
}
