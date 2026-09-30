import type { TipoAlerta, Tipologia } from "@/lib/dominio";
import { normalizar } from "./emparejar";

// Libro "Ajustes de inventario vs ventas" que arma la coordinación a partir de los reportes de
// la Dirección de Operaciones. Tiene dos hojas: la de sucursales —la cadena completa y el
// detalle de Zona Oriente por tipología— y la de categorías.
//
// El libro trae sus propios porcentajes, pero están calculados dividiendo unidades ajustadas
// entre dólares vendidos, así que no se usan: se leen solo las cifras base —venta, unidades
// y USD a costo— y la aplicación deriva lo demás. Las columnas se ubican por el encabezado de
// la primera sección, que es el correcto; el de la segunda rotula "AJUSTE USD" una columna que
// trae unidades (lo confirman las sumas por tipología de cada tienda).

/** Una hoja como matriz de celdas: fila y columna desde cero (la columna A es la 0). */
export type Hoja = { nombre: string; filas: (string | number | null)[][] };

export type AjusteTipologia = {
  /** Como viene escrita en el libro. */
  etiqueta: string;
  tipologia: Tipologia | null;
  unidades: number | null;
  monto: number | null;
};

export type TiendaLibro = {
  nombre: string;
  ventas: number | null;
  unidades: number | null;
  monto: number | null;
  tipologias: AjusteTipologia[];
};

export type SucursalLibro = {
  nombre: string;
  /** Marcada con ★: pertenece o abastece a Zona Oriente. */
  deLaZona: boolean;
  /** Centro de distribución: ajusta inventario pero no vende. */
  esCentro: boolean;
  ventas: number | null;
  unidades: number | null;
};

export type CategoriaLibro = {
  categoria: string;
  ventas: number | null;
  unidades: number | null;
  monto: number | null;
};

/** Lo que no cuadra dentro del propio libro. Se muestra al revisar y se guarda como alerta. */
export type HallazgoLibro = { tipo: TipoAlerta; indicador: string; mensaje: string };

export type LecturaLibroAjustes = {
  tipo: "LIBRO_AJUSTES";
  titulo: string;
  desde: string | null;
  hasta: string | null;
  cadena: { ventas: number | null; unidades: number | null; monto: number | null };
  tipologiasCadena: AjusteTipologia[];
  sucursales: SucursalLibro[];
  tiendas: TiendaLibro[];
  categoriasCadena: CategoriaLibro[];
  categoriasTiendas: { tienda: string; categorias: CategoriaLibro[] }[];
  observaciones: HallazgoLibro[];
};

const TIPOLOGIA_POR_ETIQUETA: Record<string, Tipologia> = {
  merma: "MERMA",
  inventario: "INVENTARIO",
  "mercancia danada": "MERCANCIA_DANADA",
  ventas: "VENTAS",
  donacion: "DONACION",
  mercadeo: "MERCADEO",
  hurto: "HURTO",
  "carga y descarga": "CARGA_DESCARGA",
};

const MESES: Record<string, number> = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12,
};

const texto = (valor: unknown) => (typeof valor === "string" ? valor.trim() : "");
const numero = (valor: unknown) => (typeof valor === "number" && Number.isFinite(valor) ? valor : null);
/** Quita los adornos del libro (▶, ★, ▌) y los espacios de sangría. */
const limpio = (valor: unknown) => texto(valor).replace(/[▶★▌]/g, "").trim();

function tipologiaDe(etiqueta: string): Tipologia | null {
  return TIPOLOGIA_POR_ETIQUETA[normalizar(etiqueta)] ?? null;
}

export function esLibroAjustes(hojas: Hoja[]) {
  const primera = hojas[0];
  if (!primera) return false;
  const titulo = texto(primera.filas[0]?.find((celda) => texto(celda)));
  return /AJUSTES DE INVENTARIO VS VENTAS/i.test(titulo);
}

/** "…JUNIO 2026 (1ª SEMANA: 01–07 JUN)" → 2026-06-01 a 2026-06-07; sin rango, el mes entero. */
export function periodoDelTitulo(titulo: string): { desde: string | null; hasta: string | null } {
  const anio = titulo.match(/\b(20\d{2})\b/)?.[1];
  if (!anio) return { desde: null, hasta: null };
  const iso = (mes: number, dia: number) =>
    `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

  const rango = titulo.match(/(\d{1,2})\s*[–-]\s*(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóú]{3})/);
  if (rango) {
    const mes = MESES[normalizar(rango[3])];
    if (mes) return { desde: iso(mes, Number(rango[1])), hasta: iso(mes, Number(rango[2])) };
  }
  const nombreMes = titulo.match(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/i)?.[1];
  const mes = nombreMes ? MESES[normalizar(nombreMes).slice(0, 3)] : undefined;
  if (!mes) return { desde: null, hasta: null };
  const ultimo = new Date(Date.UTC(Number(anio), mes, 0)).getUTCDate();
  return { desde: iso(mes, 1), hasta: iso(mes, ultimo) };
}

/** Columnas de la primera hoja, tomadas del primer encabezado (el único rotulado bien). */
function columnasSucursales(hoja: Hoja) {
  const encabezado = hoja.filas.find((fila) => fila.some((celda) => texto(celda) === "AJUSTE UNIDADES"));
  if (!encabezado) return null;
  const col = (rotulo: string) => encabezado.findIndex((celda) => texto(celda) === rotulo);
  return {
    nombre: col("CONCEPTO / SUCURSAL"),
    ventas: col("VENTAS USD"),
    unidades: col("AJUSTE UNIDADES"),
    monto: col("AJUSTE USD (Costo)"),
    tipologia: col("TIPOLOGÍA"),
    // Junto a la tipología, "VALOR AJUSTE" trae las unidades (las tiendas lo confirman).
    unidadesTipologia: col("VALOR AJUSTE"),
  };
}

function leerHojaSucursales(hoja: Hoja, observaciones: HallazgoLibro[]) {
  const c = columnasSucursales(hoja);
  type Totales = { ventas: number | null; unidades: number | null; monto: number | null };
  const vacia = {
    cadena: { ventas: null, unidades: null, monto: null } as Totales,
    tipologiasCadena: [] as AjusteTipologia[],
    sucursales: [] as SucursalLibro[],
    tiendas: [] as TiendaLibro[],
    zona: null as Totales | null,
    tipologiasZona: [] as AjusteTipologia[],
  };
  if (!c) {
    observaciones.push({
      tipo: "DATO_FALTANTE",
      indicador: "ENCABEZADO_LIBRO",
      mensaje: "No se encontró el encabezado de la hoja de sucursales.",
    });
    return vacia;
  }

  let seccion: "CADENA" | "TIPOLOGIAS_CADENA" | "ZONA" | "TIPOLOGIAS_ZONA" | null = null;
  const resultado = vacia;

  for (const fila of hoja.filas) {
    const nombre = limpio(fila[c.nombre]);
    const crudo = texto(fila[c.nombre]);
    const etiquetaTipologia = limpio(fila[c.tipologia]);

    if (/^SECCI[ÓO]N 1/i.test(nombre)) seccion = "CADENA";
    else if (/^AJUSTES POR TIPOLOG[ÍI]A.*CADENA/i.test(nombre)) seccion = "TIPOLOGIAS_CADENA";
    else if (/^SECCI[ÓO]N 2/i.test(nombre)) seccion = "ZONA";
    else if (/^AJUSTES POR TIPOLOG[ÍI]A.*ZONA/i.test(nombre)) seccion = "TIPOLOGIAS_ZONA";
    else if (/^LEYENDA/i.test(nombre)) seccion = null;
    if (!seccion || /^SECCI[ÓO]N|^AJUSTES POR|^CONCEPTO/i.test(nombre)) continue;

    const ventas = numero(fila[c.ventas]);
    const unidades = numero(fila[c.unidades]);
    const monto = numero(fila[c.monto]);

    if (seccion === "CADENA" && nombre) {
      if (/^TOTAL CADENA/i.test(nombre)) {
        resultado.cadena = { ventas, unidades, monto };
      } else {
        resultado.sucursales.push({
          nombre,
          deLaZona: crudo.includes("★"),
          esCentro: /^CENDI\b/i.test(nombre),
          ventas,
          unidades,
        });
      }
    } else if ((seccion === "TIPOLOGIAS_CADENA" || seccion === "TIPOLOGIAS_ZONA") && etiquetaTipologia) {
      if (/^TOTAL$/i.test(etiquetaTipologia)) continue;
      const ajuste = {
        etiqueta: etiquetaTipologia,
        tipologia: tipologiaDe(etiquetaTipologia),
        unidades: numero(fila[c.unidadesTipologia]),
        monto,
      };
      (seccion === "TIPOLOGIAS_CADENA" ? resultado.tipologiasCadena : resultado.tipologiasZona).push(ajuste);
    } else if (seccion === "ZONA") {
      if (/^TOTAL ZONA/i.test(nombre)) {
        resultado.zona = { ventas, unidades, monto };
      } else if (nombre) {
        resultado.tiendas.push({ nombre, ventas, unidades, monto, tipologias: [] });
      } else if (etiquetaTipologia && resultado.tiendas.length) {
        resultado.tiendas.at(-1)!.tipologias.push({
          etiqueta: etiquetaTipologia,
          tipologia: tipologiaDe(etiquetaTipologia),
          unidades: numero(fila[c.unidadesTipologia]),
          monto,
        });
      }
    }
  }
  return resultado;
}

function leerHojaCategorias(hoja: Hoja | undefined) {
  const categoriasCadena: CategoriaLibro[] = [];
  const categoriasTiendas: { tienda: string; categorias: CategoriaLibro[] }[] = [];
  if (!hoja) return { categoriasCadena, categoriasTiendas };

  const encabezado = hoja.filas.find((fila) => fila.some((celda) => texto(celda) === "CATEGORÍA"));
  if (!encabezado) return { categoriasCadena, categoriasTiendas };
  const todas = (rotulo: string) =>
    encabezado.flatMap((celda, indice) => (texto(celda) === rotulo ? [indice] : []));
  const [ventasCadena, ventasZona] = todas("VENTAS USD");
  const [unidadesCadena, unidadesZona] = todas("AJUSTE UNIDADES");
  const [montoCadena, montoZona] = todas("AJUSTE USD (Costo)");
  const nombreCadena = encabezado.findIndex((celda) => texto(celda) === "CATEGORÍA");
  const nombreZona = encabezado.findIndex((celda) => texto(celda) === "SUCURSAL / CATEGORÍA");

  for (const fila of hoja.filas.slice(hoja.filas.indexOf(encabezado) + 1)) {
    const izquierda = limpio(fila[nombreCadena]);
    if (izquierda && !/^TOTAL|^Fuente/i.test(izquierda) && numero(fila[ventasCadena]) !== null) {
      categoriasCadena.push({
        categoria: izquierda,
        ventas: numero(fila[ventasCadena]),
        unidades: numero(fila[unidadesCadena]),
        monto: numero(fila[montoCadena]),
      });
    }

    if (nombreZona < 0) continue;
    const crudo = texto(fila[nombreZona]);
    const derecha = limpio(fila[nombreZona]);
    // Las notas al pie son celdas combinadas que el lector repite en cada columna: una fila
    // sin cifras no es una categoría ni una tienda.
    if (!derecha || /^TOTAL/i.test(derecha) || numero(fila[ventasZona]) === null) continue;
    if (crudo.startsWith("▶")) {
      categoriasTiendas.push({ tienda: derecha, categorias: [] });
    } else if (categoriasTiendas.length) {
      categoriasTiendas.at(-1)!.categorias.push({
        categoria: derecha,
        ventas: numero(fila[ventasZona]),
        unidades: numero(fila[unidadesZona]),
        monto: numero(fila[montoZona]),
      });
    }
  }
  return { categoriasCadena, categoriasTiendas };
}

const sumar = (valores: (number | null)[]) =>
  valores.reduce<number>((total, valor) => total + (valor ?? 0), 0);
const miles = (valor: number) => Math.round(valor).toLocaleString("es-VE");
const pct = (valor: number) => `${valor.toFixed(2).replace(".", ",")} %`;

/** Descuadres entre las cifras base del propio libro: se dicen, no se corrigen. */
function revisar(
  lectura: Omit<LecturaLibroAjustes, "observaciones">,
  zona: ReturnType<typeof leerHojaSucursales>["zona"],
  tipologiasZona: AjusteTipologia[],
  observaciones: HallazgoLibro[],
) {
  const { cadena, sucursales, tiendas } = lectura;

  if (cadena.unidades !== null && sucursales.length) {
    const suma = sumar(sucursales.map((sucursal) => sucursal.unidades));
    if (Math.abs(suma - cadena.unidades) > Math.max(5, Math.abs(cadena.unidades) * 0.005)) {
      observaciones.push({
        tipo: "SUBTOTAL_DESCUADRADO",
        indicador: "UNIDADES_CADENA_LIBRO",
        mensaje:
          `Las sucursales suman ${miles(suma)} unidades ajustadas y el total de la cadena dice ` +
          `${miles(cadena.unidades)}: el total no cuadra con su detalle.`,
      });
    }
  }

  // El porcentaje del libro: unidades entre dólares. Se nombra con el caso de la cadena y el
  // de la zona, que es donde más se nota.
  if (cadena.monto !== null && cadena.unidades !== null && cadena.ventas) {
    const zonaTexto =
      zona?.monto != null && zona.unidades != null && zona.ventas
        ? ` En Zona Oriente, ${pct((zona.unidades / zona.ventas) * 100)} contra ${pct((zona.monto / zona.ventas) * 100)}.`
        : "";
    observaciones.push({
      tipo: "INDICADOR_NO_CUADRA",
      indicador: "PCT_AJUSTE_LIBRO",
      mensaje:
        `El libro calcula el % de ajuste dividiendo unidades entre dólares vendidos: da ` +
        `${pct((cadena.unidades / cadena.ventas) * 100)} para la cadena cuando en dólares es ` +
        `${pct((cadena.monto / cadena.ventas) * 100)}.${zonaTexto} La aplicación usa USD sobre ventas.`,
    });
  }

  for (const tienda of tiendas) {
    const montoTipologias = sumar(tienda.tipologias.map((ajuste) => ajuste.monto));
    const unidadesTipologias = sumar(tienda.tipologias.map((ajuste) => ajuste.unidades));
    if (tienda.monto !== null && Math.abs(montoTipologias - tienda.monto) > 2) {
      observaciones.push({
        tipo: "SUBTOTAL_DESCUADRADO",
        indicador: `MONTO_TIPOLOGIAS_${normalizar(tienda.nombre)}`,
        mensaje: `${tienda.nombre}: las tipologías suman ${miles(montoTipologias)} $ y el total de la tienda dice ${miles(tienda.monto)} $.`,
      });
    }
    if (tienda.unidades !== null && Math.abs(unidadesTipologias - tienda.unidades) > 2) {
      observaciones.push({
        tipo: "SUBTOTAL_DESCUADRADO",
        indicador: `UNIDADES_TIPOLOGIAS_${normalizar(tienda.nombre)}`,
        mensaje: `${tienda.nombre}: las tipologías suman ${miles(unidadesTipologias)} unidades y el total de la tienda dice ${miles(tienda.unidades)}.`,
      });
    }
  }

  for (const ajuste of tipologiasZona) {
    const suma = sumar(
      tiendas.flatMap((tienda) =>
        tienda.tipologias.filter((propia) => propia.etiqueta === ajuste.etiqueta).map((propia) => propia.unidades),
      ),
    );
    if (ajuste.unidades !== null && Math.abs(suma - ajuste.unidades) > 2) {
      observaciones.push({
        tipo: "SUBTOTAL_DESCUADRADO",
        indicador: `UNIDADES_ZONA_${normalizar(ajuste.etiqueta)}`,
        mensaje: `${ajuste.etiqueta} en Zona Oriente: las tiendas suman ${miles(suma)} unidades y el consolidado de la zona dice ${miles(ajuste.unidades)}.`,
      });
    }
  }

  const sinTipologia = [...lectura.tipologiasCadena, ...tiendas.flatMap((tienda) => tienda.tipologias)]
    .filter((ajuste) => !ajuste.tipologia)
    .map((ajuste) => ajuste.etiqueta);
  if (sinTipologia.length) {
    observaciones.push({
      tipo: "DATO_FALTANTE",
      indicador: "TIPOLOGIA_DESCONOCIDA",
      mensaje: `Tipologías que la aplicación no conoce: ${[...new Set(sinTipologia)].join(", ")}. Quedan fuera.`,
    });
  }
}

export function leerLibroAjustes(hojas: Hoja[]): LecturaLibroAjustes {
  const [sucursales, categorias] = hojas;
  const titulo = texto(sucursales?.filas[0]?.find((celda) => texto(celda)));
  const observaciones: HallazgoLibro[] = [];

  const hoja = leerHojaSucursales(sucursales, observaciones);
  const { categoriasCadena, categoriasTiendas } = leerHojaCategorias(categorias);

  const lectura = {
    tipo: "LIBRO_AJUSTES" as const,
    titulo,
    ...periodoDelTitulo(titulo),
    cadena: hoja.cadena,
    tipologiasCadena: hoja.tipologiasCadena,
    sucursales: hoja.sucursales,
    tiendas: hoja.tiendas,
    categoriasCadena,
    categoriasTiendas,
  };
  revisar(lectura, hoja.zona, hoja.tipologiasZona, observaciones);
  if (!lectura.desde) {
    observaciones.push({
      tipo: "DATO_FALTANTE",
      indicador: "PERIODO_LIBRO",
      mensaje: "El título no trae el período: no se puede ubicar el corte.",
    });
  }

  return { ...lectura, observaciones };
}
