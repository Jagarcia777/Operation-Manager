// Ritmo diario de la cadena. El Resumen Ejecutivo publica dos cuadros de siete días —cada día
// contra el anterior y contra el mismo día de la semana pasada—, pero son dos lecturas de una
// sola serie. Aquí se guarda la serie y se derivan los dos comparativos, que es lo que evita
// que un mismo número tenga dos versiones según el cuadro donde se mire.

export type PuntoDiario = { fecha: Date; ventas: number };

export type DiaComparado = {
  fecha: Date;
  /** Lunes, martes… Importa porque un sábado no se compara con un martes. */
  diaSemana: string;
  ventas: number;
  anterior: number | null;
  variacionAnterior: number | null;
  semanaAnterior: number | null;
  variacionSemanal: number | null;
};

const DIAS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

function clave(fecha: Date) {
  return fecha.toISOString().slice(0, 10);
}

function restarDias(fecha: Date, dias: number) {
  const resultado = new Date(fecha);
  resultado.setUTCDate(resultado.getUTCDate() - dias);
  return resultado;
}

function variacion(actual: number, referencia: number | null): number | null {
  if (referencia === null || referencia === 0) return null;
  return ((actual - referencia) / referencia) * 100;
}

/**
 * Los últimos `dias` de la serie, cada uno con su día anterior y con el mismo día de la semana
 * pasada. Lo que falta queda en null: sin referencia no hay variación que enseñar, y un cero
 * ahí se leería como "no cambió".
 */
export function compararDias(serie: PuntoDiario[], dias = 7): DiaComparado[] {
  const porFecha = new Map(serie.map((punto) => [clave(punto.fecha), punto.ventas]));
  const ordenada = [...serie].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  return ordenada.slice(0, dias).map((punto) => {
    const anterior = porFecha.get(clave(restarDias(punto.fecha, 1))) ?? null;
    const semanaAnterior = porFecha.get(clave(restarDias(punto.fecha, 7))) ?? null;
    return {
      fecha: punto.fecha,
      diaSemana: DIAS[punto.fecha.getUTCDay()],
      ventas: punto.ventas,
      anterior,
      variacionAnterior: variacion(punto.ventas, anterior),
      semanaAnterior,
      variacionSemanal: variacion(punto.ventas, semanaAnterior),
    };
  });
}

export type ResumenRitmo = {
  dias: DiaComparado[];
  /** Promedio diario de los últimos siete días con dato. */
  promedio: number | null;
  /** El mismo promedio de la semana anterior, para ver la tendencia sin el ruido del día. */
  promedioSemanaAnterior: number | null;
  variacionSemanal: number | null;
  mejor: DiaComparado | null;
  peor: DiaComparado | null;
};

function promediar(valores: number[]): number | null {
  if (!valores.length) return null;
  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

/**
 * Semana contra semana en vez de día contra día. Un sábado siempre vende más que un martes, así
 * que comparar días sueltos mide el calendario, no la operación: el promedio de siete días
 * elimina esa estacionalidad y deja ver si la cadena se mueve.
 */
export function resumirRitmo(serie: PuntoDiario[]): ResumenRitmo {
  const ordenada = [...serie].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  const dias = compararDias(ordenada, 7);

  const ultimos = ordenada.slice(0, 7).map((punto) => punto.ventas);
  const previos = ordenada.slice(7, 14).map((punto) => punto.ventas);

  const promedio = promediar(ultimos);
  const promedioSemanaAnterior = previos.length === 7 ? promediar(previos) : null;

  const conDato = [...dias].sort((a, b) => b.ventas - a.ventas);

  return {
    dias,
    promedio,
    promedioSemanaAnterior,
    variacionSemanal:
      promedio === null || promedioSemanaAnterior === null
        ? null
        : variacion(promedio, promedioSemanaAnterior),
    mejor: conDato[0] ?? null,
    peor: conDato.at(-1) ?? null,
  };
}

// ─── Perfil por día de la semana ────────────────────────────────────────────
// El otro uso de la serie diaria: saber cuánto pesa cada día en la semana. Sirve para dos
// decisiones que hoy se toman a ojo —dónde poner horas de caja y reposición, y si un martes
// flojo es flojo de verdad o solo es martes— y para eso no basta una semana: un feriado o una
// quincena la tuercen. Se promedian varias semanas y se dice con cuántas.

export type DiaDelPerfil = {
  /** 0 = domingo … 6 = sábado, como `getUTCDay`. */
  indice: number;
  diaSemana: string;
  /** Promedio de ese día en la ventana, sin contar la última vez que ocurrió. */
  promedio: number | null;
  /** Cuántas veces entró al promedio. */
  observaciones: number;
  /** 100 = día promedio de la semana; 120 = vende 20 % más que el día típico. */
  indiceSemana: number | null;
  /** Qué parte de la venta de una semana típica cae ese día. */
  pesoSemana: number | null;
  /** La última vez que ocurrió ese día, contra su propio promedio. */
  ultimo: { fecha: Date; ventas: number; variacion: number | null } | null;
};

export type PerfilSemanal = { semanas: number; dias: DiaDelPerfil[] };

/**
 * Promedio por día de la semana en las últimas `semanas`. La última ocurrencia de cada día queda
 * fuera de su propio promedio: es la que se juzga, y compararla contra un promedio que la incluye
 * achica la diferencia justo cuando más importa. El índice y el peso se calculan sobre los
 * promedios —no sobre la suma de días—, así un día con menos observaciones no pesa de menos.
 */
export function perfilSemanal(serie: PuntoDiario[], semanas = 8): PerfilSemanal | null {
  if (!serie.length) return null;
  const ordenada = [...serie].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  const limite = restarDias(ordenada[0].fecha, semanas * 7).getTime();
  const ventana = ordenada.filter((punto) => punto.fecha.getTime() > limite);

  const base = DIAS.map((diaSemana, indice) => {
    const delDia = ventana.filter((punto) => punto.fecha.getUTCDay() === indice);
    const [ultimo, ...previos] = delDia;
    const promedio = promediar(previos.map((punto) => punto.ventas));
    return {
      indice,
      diaSemana,
      promedio,
      observaciones: previos.length,
      ultimo: ultimo
        ? {
            fecha: ultimo.fecha,
            ventas: ultimo.ventas,
            variacion: variacion(ultimo.ventas, promedio),
          }
        : null,
    };
  });

  // Sin al menos dos semanas no hay perfil: un solo lunes no es "los lunes".
  const conPromedio = base.filter((dia) => dia.promedio !== null);
  if (conPromedio.length < 7) return null;

  const semanaTipica = conPromedio.reduce((total, dia) => total + dia.promedio!, 0);
  const diaTipico = semanaTipica / 7;

  // Lunes primero: así se lee una semana de operación.
  const dias = [...base.slice(1), base[0]].map((dia) => ({
    ...dia,
    indiceSemana: dia.promedio === null ? null : (dia.promedio / diaTipico) * 100,
    pesoSemana: dia.promedio === null ? null : (dia.promedio / semanaTipica) * 100,
  }));

  return { semanas: Math.min(semanas, Math.max(...dias.map((dia) => dia.observaciones + 1))), dias };
}
