import type { EstadoEficiencia, KpiPlantilla } from "@/lib/dominio";

// Eficiencia de la plantilla: cuánto produce cada hora de trabajo pagada.
// Método: Engineered Labor Standards + benchmarking agregado (NRF, RILA, IGD, WERC, ISSA).
//
// La pieza que hace que esto se pueda sumar entre áreas son las HORAS GANADAS:
// horas ganadas = volumen del área ÷ estándar del área. Como el resultado está en horas,
// un área medida en transacciones y otra medida en unidades se pueden agregar sin mezclar
// unidades. El índice de la tienda es entonces
//
//     Σ horas ganadas ÷ Σ horas trabajadas
//
// y no el promedio de los índices por área, que le daría el mismo peso a un área de veinte
// horas que a una de seiscientas.

export type AreaDefinicion = {
  id: string;
  nombre: string;
  kpi: KpiPlantilla;
  estandar: number | null;
  estandarMin: number | null;
  estandarMax: number | null;
  /** Su volumen es la venta de toda la tienda: no es propio y no entra en el total. */
  usaVentaTienda: boolean;
  orden: number;
};

export type CapturaPlantilla = {
  areaId: string;
  plantillaMeta: number | null;
  plantillaActiva: number | null;
  horasProgramadas: number | null;
  horasTrabajadas: number | null;
  horasAusentismo: number | null;
  horasExtra: number | null;
  ventas: number | null;
  unidades: number | null;
  transacciones: number | null;
  costoNomina: number | null;
};

export type FilaPlantilla = {
  areaId: string;
  area: string;
  kpi: KpiPlantilla;
  orden: number;

  plantillaMeta: number | null;
  plantillaActiva: number | null;
  cobertura: number | null;

  horasProgramadas: number | null;
  horasTrabajadas: number | null;
  horasAusentismo: number | null;
  horasExtra: number | null;
  ausentismo: number | null;
  porcentajeHorasExtra: number | null;

  splh: number | null;
  uplh: number | null;
  tplh: number | null;

  /** El KPI que le toca al área según su tipo. */
  kpiReal: number | null;
  estandar: number | null;
  estandarMin: number | null;
  estandarMax: number | null;
  indice: number | null;
  estado: EstadoEficiencia;

  /** Horas que el estándar dice que ese volumen debería haber costado. */
  horasGanadas: number | null;

  ventas: number | null;
  unidades: number | null;
  transacciones: number | null;
  costoNomina: number | null;
  costoSobreVentas: number | null;

  /** Su venta la puso la app desde el total de la tienda, no la capturó el usuario. */
  ventaDerivada: boolean;
};

export type ResumenPlantilla = {
  filas: FilaPlantilla[];

  plantillaMeta: number | null;
  plantillaActiva: number | null;
  cobertura: number | null;

  horasProgramadas: number | null;
  horasTrabajadas: number | null;
  horasAusentismo: number | null;
  horasExtra: number | null;
  ausentismo: number | null;
  porcentajeHorasExtra: number | null;

  /** Venta de la tienda en el corte: es el denominador del costo de nómina sobre ventas. */
  ventas: number | null;
  costoNomina: number | null;
  costoSobreVentas: number | null;
  ventasPorHora: number | null;

  horasGanadas: number | null;
  /** Σ horas ganadas ÷ Σ horas trabajadas, sobre las áreas con volumen medible. */
  indice: number | null;
  estado: EstadoEficiencia;
  /** Cuántas áreas entraron en el índice: las de solo cobertura quedan fuera. */
  areasMedidas: number;
  areasConDatos: number;
  areasOptimas: number;
  areasBajoEstandar: number;
};

function esNumero(valor: number | null | undefined): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

function sumar(valores: (number | null | undefined)[]): number | null {
  const validos = valores.filter(esNumero);
  return validos.length ? validos.reduce((total, valor) => total + valor, 0) : null;
}

function razon(numerador: number | null, denominador: number | null): number | null {
  if (!esNumero(numerador) || !esNumero(denominador) || denominador === 0) return null;
  return numerador / denominador;
}

function porcentajeDe(parte: number | null, total: number | null): number | null {
  const valor = razon(parte, total);
  return valor === null ? null : valor * 100;
}

/**
 * Lee el índice con el rango a la vista. Dentro del rango de referencia el área cumple aunque
 * quede por debajo del punto medio; el umbral de 90 % solo aplica cuando no hay rango.
 */
export function leerEficiencia(
  indice: number | null,
  kpiReal: number | null,
  area: Pick<AreaDefinicion, "estandarMin" | "estandarMax">,
): EstadoEficiencia {
  if (indice === null) return "SIN_DATOS";
  if (indice >= 1) return "OPTIMO";
  if (
    esNumero(kpiReal) &&
    esNumero(area.estandarMin) &&
    kpiReal >= area.estandarMin &&
    (!esNumero(area.estandarMax) || kpiReal <= area.estandarMax)
  ) {
    return "DENTRO_DEL_RANGO";
  }
  if (indice >= 0.9) return "ACEPTABLE";
  return "BAJO_ESTANDAR";
}

/**
 * Deriva la fila de un área. `ventaTienda` alimenta a las áreas cuyo KPI se mide contra la
 * venta de toda la tienda (Administración): la app la deduce en vez de pedirla, que es lo
 * que evita que el mismo dinero se cuente dos veces.
 */
export function calcularArea(
  area: AreaDefinicion,
  captura: CapturaPlantilla | undefined,
  ventaTienda: number | null = null,
): FilaPlantilla {
  const c: CapturaPlantilla = captura ?? {
    areaId: area.id,
    plantillaMeta: null,
    plantillaActiva: null,
    horasProgramadas: null,
    horasTrabajadas: null,
    horasAusentismo: null,
    horasExtra: null,
    ventas: null,
    unidades: null,
    transacciones: null,
    costoNomina: null,
  };

  const ventaDerivada = area.usaVentaTienda && !esNumero(c.ventas) && esNumero(ventaTienda);
  const ventas = area.usaVentaTienda ? (ventaTienda ?? c.ventas) : c.ventas;

  const horas = c.horasTrabajadas;
  const splh = razon(ventas, horas);
  const uplh = razon(c.unidades, horas);
  const tplh = razon(c.transacciones, horas);
  const cobertura = porcentajeDe(c.plantillaActiva, c.plantillaMeta);

  // Cobertura se compara en porcentaje contra un estándar que también está en porcentaje.
  const kpiReal =
    area.kpi === "SPLH" ? splh : area.kpi === "UPLH" ? uplh : area.kpi === "TPLH" ? tplh : cobertura;

  const indice = razon(kpiReal, area.estandar);

  // Las áreas de solo cobertura no tienen volumen del cual ganar horas.
  const volumen =
    area.kpi === "SPLH" ? ventas : area.kpi === "UPLH" ? c.unidades : area.kpi === "TPLH" ? c.transacciones : null;
  const horasGanadas = razon(volumen, area.estandar);

  return {
    areaId: area.id,
    area: area.nombre,
    kpi: area.kpi,
    orden: area.orden,

    plantillaMeta: c.plantillaMeta,
    plantillaActiva: c.plantillaActiva,
    cobertura,

    horasProgramadas: c.horasProgramadas,
    horasTrabajadas: c.horasTrabajadas,
    horasAusentismo: c.horasAusentismo,
    horasExtra: c.horasExtra,
    ausentismo: porcentajeDe(c.horasAusentismo, c.horasProgramadas),
    porcentajeHorasExtra: porcentajeDe(c.horasExtra, c.horasProgramadas),

    splh,
    uplh,
    tplh,

    kpiReal,
    estandar: area.estandar,
    estandarMin: area.estandarMin,
    estandarMax: area.estandarMax,
    indice,
    estado: leerEficiencia(indice, kpiReal, area),

    horasGanadas,

    ventas,
    unidades: c.unidades,
    transacciones: c.transacciones,
    costoNomina: c.costoNomina,
    costoSobreVentas: porcentajeDe(c.costoNomina, ventas),

    ventaDerivada,
  };
}

/**
 * Consolida las áreas de una tienda en un corte. La venta de la tienda se deriva de las áreas
 * con venta propia y se le presta a las que se miden contra el total; el total nunca se captura.
 */
export function calcularPlantilla(
  areas: AreaDefinicion[],
  capturas: CapturaPlantilla[],
  ventaTienda: number | null = null,
): ResumenPlantilla {
  const porArea = new Map(capturas.map((captura) => [captura.areaId, captura]));

  // La venta contra la que se mide la tienda es la del tablero, no la suma de las áreas: solo
  // unas pocas áreas tienen venta propia, y sumarlas daría una fracción del negocio. Cuando
  // no llega —una tienda sin corte de ventas cargado— se cae a esa suma, que es lo único que
  // hay, y el porcentaje de costo queda sobre lo que sí se midió.
  const ventaDeAreas = sumar(
    areas
      .filter((area) => !area.usaVentaTienda)
      .map((area) => porArea.get(area.id)?.ventas ?? null),
  );
  const ventaBase = ventaTienda ?? ventaDeAreas;

  const filas = [...areas]
    .sort((a, b) => a.orden - b.orden)
    .map((area) => calcularArea(area, porArea.get(area.id), ventaBase));

  // Solo entran al agregado las áreas de las que sí llegó algo: una fila vacía no es un cero.
  const conDatos = filas.filter(
    (fila) => esNumero(fila.horasTrabajadas) || esNumero(fila.plantillaMeta),
  );
  const medibles = conDatos.filter((fila) => esNumero(fila.horasGanadas));

  const horasTrabajadas = sumar(conDatos.map((fila) => fila.horasTrabajadas));
  const horasProgramadas = sumar(conDatos.map((fila) => fila.horasProgramadas));
  const horasAusentismo = sumar(conDatos.map((fila) => fila.horasAusentismo));
  const horasExtra = sumar(conDatos.map((fila) => fila.horasExtra));

  // Denominador del índice: solo las horas de las áreas que sí pueden ganar horas, para no
  // castigar a la tienda por las horas de limpieza y seguridad, que no producen volumen.
  const horasMedidas = sumar(medibles.map((fila) => fila.horasTrabajadas));
  const horasGanadas = sumar(medibles.map((fila) => fila.horasGanadas));
  const indice = razon(horasGanadas, horasMedidas);

  const plantillaMeta = sumar(conDatos.map((fila) => fila.plantillaMeta));
  const plantillaActiva = sumar(conDatos.map((fila) => fila.plantillaActiva));
  const costoNomina = sumar(conDatos.map((fila) => fila.costoNomina));

  return {
    filas,

    plantillaMeta,
    plantillaActiva,
    cobertura: porcentajeDe(plantillaActiva, plantillaMeta),

    horasProgramadas,
    horasTrabajadas,
    horasAusentismo,
    horasExtra,
    ausentismo: porcentajeDe(horasAusentismo, horasProgramadas),
    porcentajeHorasExtra: porcentajeDe(horasExtra, horasProgramadas),

    ventas: ventaBase,
    costoNomina,
    costoSobreVentas: porcentajeDe(costoNomina, ventaBase),
    ventasPorHora: razon(ventaBase, horasTrabajadas),

    horasGanadas,
    indice,
    estado: indice === null ? "SIN_DATOS" : indice >= 1 ? "OPTIMO" : indice >= 0.9 ? "ACEPTABLE" : "BAJO_ESTANDAR",
    areasMedidas: medibles.length,
    areasConDatos: conDatos.length,
    areasOptimas: conDatos.filter(
      (fila) => fila.estado === "OPTIMO" || fila.estado === "DENTRO_DEL_RANGO",
    ).length,
    areasBajoEstandar: conDatos.filter((fila) => fila.estado === "BAJO_ESTANDAR").length,
  };
}

/**
 * Diferencia entre las horas que se trabajaron y las que el estándar dice que ese volumen
 * debía costar. Positivo son horas de más para el volumen movido; negativo son horas que la
 * tienda se ahorró rindiendo por encima de la referencia.
 */
export function holguraDeHoras(resumen: ResumenPlantilla): number | null {
  if (!esNumero(resumen.horasGanadas)) return null;
  const horasMedidas = sumar(
    resumen.filas.filter((fila) => esNumero(fila.horasGanadas)).map((fila) => fila.horasTrabajadas),
  );
  if (!esNumero(horasMedidas)) return null;
  return horasMedidas - resumen.horasGanadas;
}

/** Qué costarían esas horas de más, al costo por hora que muestra el propio corte. */
export function costoDeLaHolgura(resumen: ResumenPlantilla): number | null {
  const holgura = holguraDeHoras(resumen);
  const costoHora = razon(resumen.costoNomina, resumen.horasTrabajadas);
  if (holgura === null || costoHora === null) return null;
  return holgura * costoHora;
}
