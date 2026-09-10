import { mediana } from "@/lib/calculos";
import { prisma } from "@/lib/db";
import {
  ETIQUETA_TIPOLOGIA,
  TIPOLOGIAS,
  type Severidad,
  type Tipologia,
  type TipoAlerta,
} from "@/lib/dominio";

// Motor de validación. Marca lo que no cuadra y explica por qué; jamás corrige un dato.
// Las decisiones humanas mandan: una alerta revisada o descartada no vuelve a levantarse.

export type AlertaDetectada = {
  tipo: TipoAlerta;
  severidad: Severidad;
  tiendaId: string | null;
  indicador: string | null;
  valorObservado: number | null;
  valorEsperado: number | null;
  mensaje: string;
};

const UMBRALES_POR_DEFECTO: Record<string, number> = {
  CUMPLIMIENTO_MIN: 50,
  CUMPLIMIENTO_MAX: 150,
  AJUSTE_MAX_PCT: 1,
  FACTOR_ATIPICO: 3,
  SALTO_MAX_PCT: 40,
  TOLERANCIA_SUBTOTAL: 1,
};

export async function leerUmbrales(): Promise<Record<string, number>> {
  const guardados = await prisma.umbral.findMany();
  const valores = { ...UMBRALES_POR_DEFECTO };
  for (const umbral of guardados) valores[umbral.clave] = umbral.valor;
  return valores;
}

/** Desviación absoluta mediana: mide dispersión sin que un solo caso extremo la distorsione. */
function desviacionMediana(valores: number[], centro: number): number | null {
  if (!valores.length) return null;
  return mediana(valores.map((valor) => Math.abs(valor - centro)));
}

export async function detectarAlertas(corteId: string): Promise<AlertaDetectada[]> {
  const umbrales = await leerUmbrales();
  const alertas: AlertaDetectada[] = [];

  const [corte, tiendas, ventas, ajustes] = await Promise.all([
    prisma.corte.findUnique({ where: { id: corteId } }),
    prisma.tienda.findMany({ where: { activa: true } }),
    prisma.registroVentas.findMany({ where: { corteId } }),
    prisma.registroAjuste.findMany({ where: { corteId } }),
  ]);
  if (!corte) return alertas;

  const nombrePorTienda = new Map(tiendas.map((tienda) => [tienda.id, tienda.nombre]));
  const ventasPorTienda = new Map(ventas.map((registro) => [registro.tiendaId, registro]));

  // 1. Datos faltantes: una tienda sin cifras deja el subtotal de su zona incompleto.
  for (const tienda of tiendas) {
    const registro = ventasPorTienda.get(tienda.id);
    if (!registro) {
      alertas.push({
        tipo: "DATO_FALTANTE",
        severidad: "ALTA",
        tiendaId: tienda.id,
        indicador: null,
        valorObservado: null,
        valorEsperado: null,
        mensaje: `${tienda.nombre} no tiene ventas cargadas en este corte; el subtotal de su zona queda incompleto.`,
      });
      continue;
    }
    if (registro.ventasReal === null || registro.ventasMeta === null) {
      alertas.push({
        tipo: "DATO_FALTANTE",
        severidad: "MEDIA",
        tiendaId: tienda.id,
        indicador: "ventas",
        valorObservado: registro.ventasReal,
        valorEsperado: registro.ventasMeta,
        mensaje: `${tienda.nombre} tiene incompleta la venta del corte (falta ${
          registro.ventasReal === null ? "el real" : "la meta"
        }).`,
      });
    }
  }

  // 2. Cumplimientos imposibles: casi siempre son Meta y Real intercambiados al cargar.
  for (const registro of ventas) {
    if (!registro.ventasReal || !registro.ventasMeta) continue;
    const cumplimiento = (registro.ventasReal / registro.ventasMeta) * 100;
    const nombre = nombrePorTienda.get(registro.tiendaId) ?? "Tienda";

    if (cumplimiento > umbrales.CUMPLIMIENTO_MAX || cumplimiento < umbrales.CUMPLIMIENTO_MIN) {
      alertas.push({
        tipo: "POSIBLE_INTERCAMBIO",
        severidad: "ALTA",
        tiendaId: registro.tiendaId,
        indicador: "ventas",
        valorObservado: Number(cumplimiento.toFixed(1)),
        valorEsperado: 100,
        mensaje: `${nombre} cierra con ${cumplimiento.toFixed(1)} % de cumplimiento en ventas. Revisar si Meta y Real quedaron invertidos al cargar el corte.`,
      });
    }
  }

  // 3. Ajustes atípicos: contra el umbral del negocio y contra la dispersión de la cadena.
  for (const tipologia of TIPOLOGIAS) {
    const delTipo = ajustes.filter((ajuste) => ajuste.tipologia === tipologia);
    const porcentajes = delTipo
      .map((ajuste) => {
        const venta = ventasPorTienda.get(ajuste.tiendaId)?.ventasReal ?? null;
        if (!venta) return null;
        return { tiendaId: ajuste.tiendaId, valor: (ajuste.monto / venta) * 100 };
      })
      .filter((entrada): entrada is { tiendaId: string; valor: number } => entrada !== null);

    if (!porcentajes.length) continue;

    // Los ajustes vienen en negativo por ser en contra: lo que importa es la magnitud.
    const magnitudes = porcentajes.map((entrada) => Math.abs(entrada.valor));
    const centro = mediana(magnitudes) ?? 0;
    const dispersion = desviacionMediana(magnitudes, centro);

    for (const entrada of porcentajes) {
      const nombre = nombrePorTienda.get(entrada.tiendaId) ?? "Tienda";
      const magnitud = Math.abs(entrada.valor);
      const superaUmbral = magnitud > umbrales.AJUSTE_MAX_PCT;
      const superaDispersion =
        dispersion !== null &&
        dispersion > 0 &&
        magnitud - centro > umbrales.FACTOR_ATIPICO * dispersion;

      if (superaUmbral || superaDispersion) {
        alertas.push({
          tipo: "VALOR_ATIPICO",
          severidad: superaUmbral && superaDispersion ? "ALTA" : "MEDIA",
          tiendaId: entrada.tiendaId,
          indicador: tipologia,
          valorObservado: Number(entrada.valor.toFixed(2)),
          valorEsperado: Number(centro.toFixed(2)),
          mensaje: `${nombre} registra ${entrada.valor.toFixed(2)} % de ventas en ${ETIQUETA_TIPOLOGIA[tipologia as Tipologia]}, muy por encima de la mediana de la cadena (${centro.toFixed(2)} %). Confirmar si es real o un error de registro.`,
        });
      }
    }
  }

  // 4. Saltos contra el corte anterior comparable.
  const anterior = await prisma.corte.findFirst({
    where: { fechaFin: { lt: corte.fechaFin }, tipo: corte.tipo },
    orderBy: { fechaFin: "desc" },
  });

  if (anterior) {
    const previos = await prisma.registroVentas.findMany({ where: { corteId: anterior.id } });
    const previoPorTienda = new Map(previos.map((registro) => [registro.tiendaId, registro]));

    for (const registro of ventas) {
      const previo = previoPorTienda.get(registro.tiendaId);
      if (!registro.ventasReal || !previo?.ventasReal) continue;
      const variacion = ((registro.ventasReal - previo.ventasReal) / previo.ventasReal) * 100;
      if (Math.abs(variacion) > umbrales.SALTO_MAX_PCT) {
        const nombre = nombrePorTienda.get(registro.tiendaId) ?? "Tienda";
        alertas.push({
          tipo: "SALTO_IMPOSIBLE",
          severidad: "MEDIA",
          tiendaId: registro.tiendaId,
          indicador: "ventas",
          valorObservado: Number(variacion.toFixed(1)),
          valorEsperado: umbrales.SALTO_MAX_PCT,
          mensaje: `${nombre} varía ${variacion.toFixed(1)} % en ventas contra ${anterior.nombre}. Verificar el dato antes de leerlo como tendencia.`,
        });
      }
    }
  }

  return alertas;
}

/** Compara un subtotal traído de la fuente contra la suma calculada de sus tiendas. */
export function revisarSubtotal(
  etiqueta: string,
  subtotalExterno: number,
  sumaCalculada: number,
  tolerancia: number,
): AlertaDetectada | null {
  const diferencia = subtotalExterno - sumaCalculada;
  if (Math.abs(diferencia) <= tolerancia) return null;
  return {
    tipo: "SUBTOTAL_DESCUADRADO",
    severidad: "ALTA",
    tiendaId: null,
    indicador: etiqueta,
    valorObservado: subtotalExterno,
    valorEsperado: sumaCalculada,
    mensaje: `El subtotal de ${etiqueta} en la fuente no coincide con la suma de sus tiendas: diferencia de ${diferencia.toFixed(2)}.`,
  };
}

function firma(alerta: { tipo: string; tiendaId: string | null; indicador: string | null }) {
  return `${alerta.tipo}|${alerta.tiendaId ?? ""}|${alerta.indicador ?? ""}`;
}

/**
 * Guarda las alertas nuevas del corte. Respeta lo ya decidido: si una alerta con la misma firma
 * fue revisada o descartada, no se vuelve a levantar.
 */
export async function sincronizarAlertas(corteId: string) {
  const [detectadas, existentes] = await Promise.all([
    detectarAlertas(corteId),
    prisma.alerta.findMany({ where: { corteId } }),
  ]);

  const conocidas = new Set(existentes.map(firma));
  const nuevas = detectadas.filter((alerta) => !conocidas.has(firma(alerta)));

  if (nuevas.length) {
    await prisma.alerta.createMany({
      data: nuevas.map((alerta) => ({ ...alerta, corteId })),
    });
  }

  return { creadas: nuevas.length, detectadas: detectadas.length };
}
