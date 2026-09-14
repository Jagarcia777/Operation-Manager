import type { AlertaDetectada } from "@/lib/validacion";

// El Resumen Ejecutivo trae indicadores ya calculados —precio promedio, unidades por ticket y
// ticket promedio— junto a las cifras de las que salen. La aplicación no los usa para decidir:
// deriva los suyos y compara. Cuando el impreso y el derivado no coinciden, alguna de las dos
// columnas no es lo que su encabezado dice, y eso hay que entenderlo antes de tomar una
// decisión con ese número.
//
// La diferencia entre un caso suelto y un sesgo sistemático importa: si el mismo indicador
// falla en casi todas las sucursales, no son veinticinco errores de captura sino una definición
// distinta, y se dice una vez. Veinticinco alertas iguales dejan la bandeja inservible.

export type IndicadorImpreso = {
  tiendaId: string;
  tienda: string;
  /** Lo que imprime el informe. */
  impreso: number | null;
  /** Lo que deriva la aplicación de las cifras base del mismo informe. */
  derivado: number | null;
};

export type Conciliacion = {
  clave: string;
  etiqueta: string;
  /** Cómo se obtiene el derivado, para poder explicar la diferencia sin abrir el código. */
  formula: string;
  valores: IndicadorImpreso[];
};

/** Por debajo de esto la diferencia es redondeo del informe, no un desacuerdo real. */
const TOLERANCIA_PCT = 1.5;

/** A partir de esta proporción de sucursales discrepantes se trata como sesgo sistemático. */
const PROPORCION_SISTEMATICA = 0.5;

function desvioPorcentual(impreso: number, derivado: number): number | null {
  if (derivado === 0) return null;
  return ((impreso - derivado) / derivado) * 100;
}

/**
 * Cuántos decimales publica el informe para ese valor. Importa porque el precio promedio se
 * imprime con uno solo: a la altura de 3,0 $ eso son casi dos puntos porcentuales de
 * cuantización, y medir ese caso con una tolerancia porcentual delata como desacuerdo lo que
 * solo es la coma que el informe no imprimió.
 */
function decimalesImpresos(valor: number): number {
  const texto = String(valor);
  const punto = texto.indexOf(".");
  return punto === -1 ? 0 : texto.length - punto - 1;
}

/** Margen que cabe dentro del último decimal publicado, más un pelo por el punto flotante. */
function toleranciaDeRedondeo(impreso: number): number {
  return 0.5 * 10 ** -decimalesImpresos(impreso) + 1e-9;
}

function coincide(impreso: number, derivado: number, desvio: number): boolean {
  return (
    Math.abs(desvio) <= TOLERANCIA_PCT ||
    Math.abs(impreso - derivado) <= toleranciaDeRedondeo(impreso)
  );
}

function medianaDe(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[medio] : (ordenados[medio - 1] + ordenados[medio]) / 2;
}

export function conciliarIndicadores(conciliaciones: Conciliacion[]): AlertaDetectada[] {
  const alertas: AlertaDetectada[] = [];

  for (const conciliacion of conciliaciones) {
    const comparables = conciliacion.valores
      .map((valor) => {
        if (valor.impreso === null || valor.derivado === null) return null;
        const desvio = desvioPorcentual(valor.impreso, valor.derivado);
        return desvio === null ? null : { ...valor, desvio };
      })
      .filter((valor): valor is IndicadorImpreso & { desvio: number } => valor !== null);

    if (!comparables.length) continue;

    const discrepantes = comparables.filter(
      (valor) => !coincide(valor.impreso!, valor.derivado!, valor.desvio),
    );
    if (!discrepantes.length) continue;

    if (discrepantes.length >= comparables.length * PROPORCION_SISTEMATICA) {
      const desvioTipico = medianaDe(discrepantes.map((valor) => valor.desvio));
      const sentido = desvioTipico > 0 ? "por encima" : "por debajo";
      alertas.push({
        tipo: "INDICADOR_NO_CUADRA",
        severidad: "MEDIA",
        tiendaId: null,
        indicador: conciliacion.clave,
        valorObservado: Number(desvioTipico.toFixed(1)),
        valorEsperado: 0,
        mensaje:
          `${conciliacion.etiqueta}: el valor impreso queda ${Math.abs(desvioTipico).toFixed(1)} % ${sentido} ` +
          `de ${conciliacion.formula} en ${discrepantes.length} de ${comparables.length} sucursales. ` +
          `Que la diferencia sea pareja en casi todas apunta a que las dos columnas no miden lo mismo, ` +
          `no a un error de captura. La aplicación usa el valor derivado.`,
      });
      continue;
    }

    for (const valor of discrepantes) {
      alertas.push({
        tipo: "INDICADOR_NO_CUADRA",
        severidad: "BAJA",
        tiendaId: valor.tiendaId,
        indicador: conciliacion.clave,
        valorObservado: Number(valor.impreso!.toFixed(2)),
        valorEsperado: Number(valor.derivado!.toFixed(2)),
        mensaje:
          `${valor.tienda}: el informe imprime ${conciliacion.etiqueta.toLowerCase()} de ` +
          `${valor.impreso!.toFixed(2)} y de sus propias cifras sale ${valor.derivado!.toFixed(2)} ` +
          `(${conciliacion.formula}). Confirmar cuál de las dos columnas está bien.`,
      });
    }
  }

  return alertas;
}
