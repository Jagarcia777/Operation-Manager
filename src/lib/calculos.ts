import { TIPOLOGIAS, type Tipologia } from "@/lib/dominio";

// Motor de cálculo determinista. Toda cifra que se muestre o que llegue al cerebro analítico
// sale de aquí: los subtotales y totales jamás se capturan, se derivan del detalle por tienda.

export type ValoresVentas = {
  ventasMeta: number | null;
  ventasReal: number | null;
  unidadesMeta: number | null;
  unidadesReal: number | null;
  transaccionesMeta: number | null;
  transaccionesReal: number | null;
  margenBrutoMeta: number | null;
  margenBrutoReal: number | null;
};

export type FilaCalculada = ValoresVentas & {
  ticketPromedio: number | null;
  ticketMeta: number | null;
  upt: number | null;
  margenBrutoUsd: number | null;
  cumplimientoVentas: number | null;
  cumplimientoUnidades: number | null;
  cumplimientoTransacciones: number | null;
  brechaVentas: number | null;
};

export type FilaTienda = FilaCalculada & {
  tiendaId: string;
  tienda: string;
  codigo: string | null;
  fechaApertura: Date | null;
};

export type BloqueZona = {
  zonaId: string;
  zona: string;
  gerente: string;
  /** Zona Oriente se abre tienda por tienda; las demás entran solo con su total. */
  detallada: boolean;
  orden: number;
  tiendas: FilaTienda[];
  subtotal: FilaCalculada;
};

export type TableroVentas = {
  zonas: BloqueZona[];
  total: FilaCalculada;
};

function sumar(valores: (number | null | undefined)[]): number | null {
  const validos = valores.filter(
    (valor): valor is number => typeof valor === "number" && Number.isFinite(valor),
  );
  return validos.length ? validos.reduce((acumulado, valor) => acumulado + valor, 0) : null;
}

function dividir(numerador: number | null, denominador: number | null): number | null {
  if (numerador === null || denominador === null || denominador === 0) return null;
  return numerador / denominador;
}

function porcentajeDe(parte: number | null, total: number | null): number | null {
  const razon = dividir(parte, total);
  return razon === null ? null : razon * 100;
}

/** Deriva ticket, UPT, cumplimientos y brecha a partir de los valores capturados. */
export function calcularFila(valores: ValoresVentas): FilaCalculada {
  const margenBrutoUsd =
    valores.ventasReal !== null && valores.margenBrutoReal !== null
      ? (valores.ventasReal * valores.margenBrutoReal) / 100
      : null;

  return {
    ...valores,
    ticketPromedio: dividir(valores.ventasReal, valores.transaccionesReal),
    ticketMeta: dividir(valores.ventasMeta, valores.transaccionesMeta),
    upt: dividir(valores.unidadesReal, valores.transaccionesReal),
    margenBrutoUsd,
    cumplimientoVentas: porcentajeDe(valores.ventasReal, valores.ventasMeta),
    cumplimientoUnidades: porcentajeDe(valores.unidadesReal, valores.unidadesMeta),
    cumplimientoTransacciones: porcentajeDe(
      valores.transaccionesReal,
      valores.transaccionesMeta,
    ),
    brechaVentas:
      valores.ventasReal !== null && valores.ventasMeta !== null
        ? valores.ventasReal - valores.ventasMeta
        : null,
  };
}

/**
 * Agrega un conjunto de filas. Los importes se suman; el %MB se pondera por ventas, porque
 * promediar porcentajes de tiendas de distinto tamaño da un margen que no existe.
 */
export function agregarFilas(filas: FilaCalculada[]): FilaCalculada {
  const ventasReal = sumar(filas.map((fila) => fila.ventasReal));
  const ventasMeta = sumar(filas.map((fila) => fila.ventasMeta));
  const margenUsdReal = sumar(filas.map((fila) => fila.margenBrutoUsd));
  const margenUsdMeta = sumar(
    filas.map((fila) =>
      fila.ventasMeta !== null && fila.margenBrutoMeta !== null
        ? (fila.ventasMeta * fila.margenBrutoMeta) / 100
        : null,
    ),
  );

  return calcularFila({
    ventasMeta,
    ventasReal,
    unidadesMeta: sumar(filas.map((fila) => fila.unidadesMeta)),
    unidadesReal: sumar(filas.map((fila) => fila.unidadesReal)),
    transaccionesMeta: sumar(filas.map((fila) => fila.transaccionesMeta)),
    transaccionesReal: sumar(filas.map((fila) => fila.transaccionesReal)),
    margenBrutoMeta: porcentajeDe(margenUsdMeta, ventasMeta),
    margenBrutoReal: porcentajeDe(margenUsdReal, ventasReal),
  });
}

type RegistroEntrada = ValoresVentas & { tiendaId: string };
type TiendaEntrada = {
  id: string;
  nombre: string;
  codigo: string | null;
  orden: number;
  fechaApertura: Date | null;
  zona: { id: string; nombre: string; gerente: string; orden: number };
};

/** Zona sin detalle de tienda: su total llega capturado, no derivado. */
export type ZonaAgregada = ValoresVentas & {
  zonaId: string;
  zona: string;
  gerente: string;
  orden: number;
};

/**
 * Arma el tablero: Zona Oriente abierta tienda por tienda, el resto de la cadena como total de
 * zona, y el total general sumando ambas fuentes.
 */
export function construirTablero(
  tiendas: TiendaEntrada[],
  registros: RegistroEntrada[],
  zonasAgregadas: ZonaAgregada[] = [],
): TableroVentas {
  const porTienda = new Map(registros.map((registro) => [registro.tiendaId, registro]));
  const zonas = new Map<string, BloqueZona>();

  const ordenadas = [...tiendas].sort(
    (a, b) => a.zona.orden - b.zona.orden || a.orden - b.orden,
  );

  for (const tienda of ordenadas) {
    const registro = porTienda.get(tienda.id);
    const fila: FilaTienda = {
      ...calcularFila({
        ventasMeta: registro?.ventasMeta ?? null,
        ventasReal: registro?.ventasReal ?? null,
        unidadesMeta: registro?.unidadesMeta ?? null,
        unidadesReal: registro?.unidadesReal ?? null,
        transaccionesMeta: registro?.transaccionesMeta ?? null,
        transaccionesReal: registro?.transaccionesReal ?? null,
        margenBrutoMeta: registro?.margenBrutoMeta ?? null,
        margenBrutoReal: registro?.margenBrutoReal ?? null,
      }),
      tiendaId: tienda.id,
      tienda: tienda.nombre,
      codigo: tienda.codigo,
      fechaApertura: tienda.fechaApertura,
    };

    const bloque = zonas.get(tienda.zona.id);
    if (bloque) {
      bloque.tiendas.push(fila);
    } else {
      zonas.set(tienda.zona.id, {
        zonaId: tienda.zona.id,
        zona: tienda.zona.nombre,
        gerente: tienda.zona.gerente,
        detallada: true,
        orden: tienda.zona.orden,
        tiendas: [fila],
        subtotal: fila,
      });
    }
  }

  const detalladas = [...zonas.values()].map((bloque) => ({
    ...bloque,
    subtotal: agregarFilas(bloque.tiendas),
  }));

  const agregadas: BloqueZona[] = zonasAgregadas.map((zona) => ({
    zonaId: zona.zonaId,
    zona: zona.zona,
    gerente: zona.gerente,
    detallada: false,
    orden: zona.orden,
    tiendas: [],
    subtotal: calcularFila(zona),
  }));

  const bloques = [...detalladas, ...agregadas].sort((a, b) => a.orden - b.orden);

  return {
    zonas: bloques,
    total: agregarFilas(bloques.map((bloque) => bloque.subtotal)),
  };
}

/** Proyección de cierre según el ritmo acumulado del período. */
export function proyectarCierre(
  real: number | null,
  diasTranscurridos: number | null | undefined,
  diasDelMes: number | null | undefined,
): number | null {
  if (real === null || !diasTranscurridos || !diasDelMes) return null;
  return (real / diasTranscurridos) * diasDelMes;
}

/** Participación de una parte en el total de la cadena. */
export function aporte(parte: number | null, total: number | null): number | null {
  return porcentajeDe(parte, total);
}

export type ValoresAjuste = { tiendaId: string; tipologia: string; monto: number | null };

export type FilaAjustes = {
  tiendaId: string;
  tienda: string;
  ventasReal: number | null;
  montos: Record<Tipologia, number | null>;
  porcentajes: Record<Tipologia, number | null>;
  totalMonto: number | null;
  totalPorcentaje: number | null;
};

export type BloqueAjustesZona = {
  zonaId: string;
  zona: string;
  gerente: string;
  tiendas: FilaAjustes[];
  subtotal: Omit<FilaAjustes, "tiendaId" | "tienda">;
};

function vacioPorTipologia(): Record<Tipologia, number | null> {
  return Object.fromEntries(TIPOLOGIAS.map((tipologia) => [tipologia, null])) as Record<
    Tipologia,
    number | null
  >;
}

/**
 * Ajustes por tipología, en monto y como % de las ventas de cada tienda: el % es lo que hace
 * comparable una tienda grande con una pequeña.
 */
export function construirAjustes(
  tiendas: TiendaEntrada[],
  ajustes: ValoresAjuste[],
  ventasPorTienda: Map<string, number | null>,
): { zonas: BloqueAjustesZona[]; total: Omit<FilaAjustes, "tiendaId" | "tienda"> } {
  const porTienda = new Map<string, Record<Tipologia, number | null>>();
  for (const ajuste of ajustes) {
    if (!TIPOLOGIAS.includes(ajuste.tipologia as Tipologia)) continue;
    const actual = porTienda.get(ajuste.tiendaId) ?? vacioPorTipologia();
    actual[ajuste.tipologia as Tipologia] = ajuste.monto;
    porTienda.set(ajuste.tiendaId, actual);
  }

  const armarFila = (tienda: TiendaEntrada): FilaAjustes => {
    const montos = porTienda.get(tienda.id) ?? vacioPorTipologia();
    const ventasReal = ventasPorTienda.get(tienda.id) ?? null;
    const porcentajes = Object.fromEntries(
      TIPOLOGIAS.map((tipologia) => [tipologia, porcentajeDe(montos[tipologia], ventasReal)]),
    ) as Record<Tipologia, number | null>;
    const totalMonto = sumar(TIPOLOGIAS.map((tipologia) => montos[tipologia]));

    return {
      tiendaId: tienda.id,
      tienda: tienda.nombre,
      ventasReal,
      montos,
      porcentajes,
      totalMonto,
      totalPorcentaje: porcentajeDe(totalMonto, ventasReal),
    };
  };

  const agregar = (filas: FilaAjustes[]): Omit<FilaAjustes, "tiendaId" | "tienda"> => {
    const ventasReal = sumar(filas.map((fila) => fila.ventasReal));
    const montos = Object.fromEntries(
      TIPOLOGIAS.map((tipologia) => [
        tipologia,
        sumar(filas.map((fila) => fila.montos[tipologia])),
      ]),
    ) as Record<Tipologia, number | null>;
    const porcentajes = Object.fromEntries(
      TIPOLOGIAS.map((tipologia) => [tipologia, porcentajeDe(montos[tipologia], ventasReal)]),
    ) as Record<Tipologia, number | null>;
    const totalMonto = sumar(TIPOLOGIAS.map((tipologia) => montos[tipologia]));

    return {
      ventasReal,
      montos,
      porcentajes,
      totalMonto,
      totalPorcentaje: porcentajeDe(totalMonto, ventasReal),
    };
  };

  const zonas = new Map<string, BloqueAjustesZona>();
  const ordenadas = [...tiendas].sort(
    (a, b) => a.zona.orden - b.zona.orden || a.orden - b.orden,
  );

  for (const tienda of ordenadas) {
    const fila = armarFila(tienda);
    const bloque = zonas.get(tienda.zona.id);
    if (bloque) {
      bloque.tiendas.push(fila);
    } else {
      zonas.set(tienda.zona.id, {
        zonaId: tienda.zona.id,
        zona: tienda.zona.nombre,
        gerente: tienda.zona.gerente,
        tiendas: [fila],
        subtotal: agregar([fila]),
      });
    }
  }

  const bloques = [...zonas.values()].map((bloque) => ({
    ...bloque,
    subtotal: agregar(bloque.tiendas),
  }));

  return {
    zonas: bloques,
    total: agregar(bloques.flatMap((bloque) => bloque.tiendas)),
  };
}

/** Mediana, base de la detección de valores atípicos (más robusta que el promedio). */
export function mediana(valores: (number | null | undefined)[]): number | null {
  const validos = valores
    .filter((valor): valor is number => typeof valor === "number" && Number.isFinite(valor))
    .sort((a, b) => a - b);
  if (!validos.length) return null;
  const medio = Math.floor(validos.length / 2);
  return validos.length % 2 ? validos[medio] : (validos[medio - 1] + validos[medio]) / 2;
}
