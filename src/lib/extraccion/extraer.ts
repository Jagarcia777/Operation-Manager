import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  ExtraccionAjustes,
  ExtraccionResumenEjecutivo,
  ExtraccionVentas,
  type ExtraccionAjustesTipo,
  type ExtraccionResumenEjecutivoTipo,
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

/**
 * Lee el Resumen Ejecutivo de Ventas de la cadena: una sola página con la tabla por sucursal,
 * el panel de KPI, la mezcla por categoría, los dos top 20 y los comparativos de siete días.
 *
 * Las dos instrucciones que más importan son las que evitan datos falsos: que la columna METAS
 * se transcriba tal como esté impresa —los ceros incluidos, porque distinguir "meta cero" de
 * "meta no cargada" es decisión de la aplicación y no del lector— y que la fila Total y la de
 * Ventas Corporativas no se confundan con sucursales.
 */
export async function extraerResumenEjecutivo(
  archivo: ArchivoEntrada,
): Promise<ExtraccionResumenEjecutivoTipo> {
  return pedirExtraccion<ExtraccionResumenEjecutivoTipo>(
    archivo,
    REGLAS_COMUNES,
    `Este documento es el "Resumen Ejecutivo de Ventas" de una cadena de supermercados: una sola página con varios cuadros. Extrae todos.

Cuadro de sucursales (arriba a la izquierda): tiene dos bloques por fila. El primero es el día anterior (VTAS, %VTAS, UNID., MB%, TRANS) y el segundo es ACUMULADOS DEL MES (VTAS, METAS, VAR. METAS, UND, TRANS, PP, UNDTKT, TKTPROM). No mezcles los dos bloques: la venta del día y la del mes son columnas distintas con el mismo encabezado.
- Transcribe METAS tal como esté impresa, incluidos los ceros. No la conviertas en null.
- %VTAS y VAR. METAS no se extraen: la aplicación los recalcula.
- La fila "Total" va en totalImpreso, nunca dentro de sucursales.
- "VENTAS CORPORATIVAS" sí va en sucursales: es una fila del informe y la aplicación ya sabe que no es una tienda.

Paneles "KPI's Dia" y "KPI's Acum." (abajo a la izquierda): las ocho cifras de cada uno, en el orden VTAS, META, Unidades, MB%, TRANS, PP, UNDTKT, TKTPROM.

Cuadro "Ventas por Categoria" (derecha): una fila por categoría con Ventas US$, Unidades y Margen %. Omite la fila Total y la columna % Ventas, que la aplicación recalcula.

Los dos "Top 20 Productos" (centro abajo): producto y unidades, marcando cada uno como PERECEDERO o NO_PERECEDERO según el cuadro del que sale. Omite las filas Total.

Comparativos de 7 días (arriba a la derecha): son dos lecturas de una misma serie de ventas diarias de la cadena. Reconstruye la serie completa en serieDiaria: cada fila da la venta de su fecha y, en la columna de comparación, la venta de la fecha con la que se compara —el día anterior en un cuadro y el mismo día de la semana anterior en el otro—. Incluye también esas fechas comparadas. Si una fecha aparece en varios sitios con el mismo valor, ponla una sola vez; si aparece con valores distintos, ponla una vez y anótalo en observaciones.`,
    zodOutputFormat(ExtraccionResumenEjecutivo),
  );
}
