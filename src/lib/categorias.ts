import { mediana } from "@/lib/calculos";
import type { ClaseBcg, ZonaPareto } from "@/lib/dominio";

// Análisis de mezcla: qué categorías sostienen la venta (Pareto) y cuáles aportan margen (BCG).
// El criterio queda explícito para que la clasificación se pueda discutir, no acatar.

export type EntradaCategoria = {
  categoriaId: string;
  categoria: string;
  ventasReal: number | null;
  unidadesReal: number | null;
  margenBrutoReal: number | null;
};

export type FilaCategoria = EntradaCategoria & {
  margenUsd: number | null;
  pesoVenta: number | null;
  acumulado: number | null;
  zonaPareto: ZonaPareto;
  claseBcg: ClaseBcg;
};

export type AnalisisCategorias = {
  filas: FilaCategoria[];
  ventaTotal: number;
  margenTotalUsd: number;
  margenTotalPct: number | null;
  medianaMargen: number | null;
  categoriasVitales: number;
};

/**
 * Clasifica cada categoría cruzando su peso en la venta contra el margen que deja:
 * peso alto es estar dentro del 80% acumulado; margen alto es superar la mediana del conjunto.
 */
function clasificar(pesoAlto: boolean, margenAlto: boolean): ClaseBcg {
  if (pesoAlto && margenAlto) return "ESTRELLA";
  if (pesoAlto) return "VACA_LECHERA";
  if (margenAlto) return "INTERROGANTE";
  return "PERRO";
}

export function analizarCategorias(entradas: EntradaCategoria[]): AnalisisCategorias {
  const conVenta = entradas.filter((entrada) => (entrada.ventasReal ?? 0) > 0);
  const ventaTotal = conVenta.reduce((total, entrada) => total + (entrada.ventasReal ?? 0), 0);

  const medianaMargen = mediana(conVenta.map((entrada) => entrada.margenBrutoReal));

  const ordenadas = [...conVenta].sort(
    (a, b) => (b.ventasReal ?? 0) - (a.ventasReal ?? 0),
  );

  let acumuladoParcial = 0;
  const filas: FilaCategoria[] = ordenadas.map((entrada) => {
    const venta = entrada.ventasReal ?? 0;
    const pesoVenta = ventaTotal > 0 ? (venta / ventaTotal) * 100 : null;
    acumuladoParcial += pesoVenta ?? 0;

    // La categoría que cruza el 80% todavía pertenece al grupo vital.
    const zonaPareto: ZonaPareto =
      acumuladoParcial - (pesoVenta ?? 0) < 80 ? "VITAL" : "COMPLEMENTO";
    const margenAlto =
      entrada.margenBrutoReal !== null &&
      medianaMargen !== null &&
      entrada.margenBrutoReal >= medianaMargen;

    return {
      ...entrada,
      margenUsd:
        entrada.margenBrutoReal !== null ? (venta * entrada.margenBrutoReal) / 100 : null,
      pesoVenta,
      acumulado: acumuladoParcial,
      zonaPareto,
      claseBcg: clasificar(zonaPareto === "VITAL", margenAlto),
    };
  });

  const margenTotalUsd = filas.reduce((total, fila) => total + (fila.margenUsd ?? 0), 0);

  return {
    filas,
    ventaTotal,
    margenTotalUsd,
    margenTotalPct: ventaTotal > 0 ? (margenTotalUsd / ventaTotal) * 100 : null,
    medianaMargen,
    categoriasVitales: filas.filter((fila) => fila.zonaPareto === "VITAL").length,
  };
}

/** Suma los registros de varias tiendas en una sola línea por categoría. */
export function consolidarCategorias(
  registros: {
    categoriaId: string;
    categoria: { nombre: string };
    ventasReal: number | null;
    unidadesReal: number | null;
    margenBrutoReal: number | null;
  }[],
): EntradaCategoria[] {
  const acumulado = new Map<
    string,
    { categoria: string; ventas: number; unidades: number; margenUsd: number }
  >();

  for (const registro of registros) {
    const actual = acumulado.get(registro.categoriaId) ?? {
      categoria: registro.categoria.nombre,
      ventas: 0,
      unidades: 0,
      margenUsd: 0,
    };
    const venta = registro.ventasReal ?? 0;
    actual.ventas += venta;
    actual.unidades += registro.unidadesReal ?? 0;
    actual.margenUsd += ((registro.margenBrutoReal ?? 0) * venta) / 100;
    acumulado.set(registro.categoriaId, actual);
  }

  return [...acumulado.entries()].map(([categoriaId, valores]) => ({
    categoriaId,
    categoria: valores.categoria,
    ventasReal: valores.ventas,
    unidadesReal: valores.unidades,
    // El margen del conjunto se pondera por venta, no se promedia.
    margenBrutoReal: valores.ventas > 0 ? (valores.margenUsd / valores.ventas) * 100 : null,
  }));
}
