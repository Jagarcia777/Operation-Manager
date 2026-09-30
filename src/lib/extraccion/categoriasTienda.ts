import { leerCifra } from "@/lib/csv";
import type { AlertaDetectada } from "@/lib/validacion";

// Reporte "Ventas por categoría" de una sucursal: la exportación a PDF del tablero de Power BI
// del sistema. Trae el texto incrustado, así que se lee directo, sin IA: cada cifra sale tal
// cual está impresa, sin costo y sin necesidad de clave. Lo que la IA aportaría —entender una
// foto o un escaneo— aquí no hace falta.
//
// La página exportada superpone varios visuales: la tabla de categorías, el top de productos,
// la lista de productos vendidos a costo o por debajo y un listado de productos cortado por el
// scroll. En el texto del PDF cada visual sale en bloque, en orden, con la posición de cada
// celda; por eso se localiza cada bloque por su título y se reconstruyen las filas por altura.

/** Un fragmento de texto del PDF con su posición (x hacia la derecha, y hacia arriba). */
export type ItemTexto = { texto: string; x: number; y: number };

export type FilaCategoriaTienda = {
  categoria: string;
  ventas: number | null;
  /** El "% Venta" tal como lo imprime el reporte: se guarda para compararlo, no para usarlo. */
  porcentajeImpreso: number | null;
  unidades: number | null;
  margen: number | null;
};

export type ProductoBajoCostoLeido = { sucursal: string; codigo: string; producto: string };

export type ProductoTopLeido = {
  posicion: number;
  /** Como lo rotula el gráfico: los nombres largos llegan cortados con "…". */
  producto: string;
  /** La etiqueta de la barra viene redondeada ("135 mil"): es una magnitud, no una cifra exacta. */
  ventasAprox: number | null;
};

export type LecturaCategoriasTienda = {
  tipo: "CATEGORIAS_TIENDA";
  /** Nombre de la sucursal tal como lo trae el reporte, completo si se puede. */
  sucursal: string | null;
  /** Período en ISO (aaaa-mm-dd). */
  desde: string | null;
  hasta: string | null;
  /** Filtros del reporte. Si no dicen "Todas", la mezcla está recortada. */
  filtros: { categoria: string | null; procedencia: string | null };
  categorias: FilaCategoriaTienda[];
  total: { ventas: number | null; unidades: number | null; margen: number | null };
  bajoCosto: ProductoBajoCostoLeido[];
  /** Top de productos por venta, en orden. Puede faltar en lecturas anteriores a este campo. */
  topProductos?: ProductoTopLeido[];
  observaciones: string[];
};

const TITULO_CATEGORIAS = "VENTAS POR CATEGORIA";
const TITULO_BAJO_COSTO = "Productos vendidos con costo mayor o igual al PVP";
const TITULO_TOP = "TOP 20 Productos de mayor venta";
const FILAS_VISIBLES_BAJO_COSTO = 12;

/** Íconos del tablero: caracteres del área de uso privado, sin significado para los datos. */
const esGlifo = (texto: string) => /^[-\s]*$/.test(texto);

function limpiar(items: ItemTexto[]) {
  return items.filter((item) => item.texto.trim() && !esGlifo(item.texto));
}

export function esReporteCategoriasTienda(items: ItemTexto[]) {
  const textos = new Set(items.map((item) => item.texto.trim()));
  return textos.has(TITULO_CATEGORIAS) && textos.has(TITULO_BAJO_COSTO);
}

/**
 * Filas de un bloque: desde el encabezado hasta la fila "Total", agrupando por altura. Las
 * celdas de una fila comparten la misma y con una diferencia de uno o dos puntos de redondeo.
 */
function filasDelBloque(items: ItemTexto[], desde: number): ItemTexto[][] {
  const filas: ItemTexto[][] = [];
  for (let i = desde; i < items.length; i++) {
    const item = items[i];
    const fila = filas.at(-1);
    if (fila && Math.abs(fila[0].y - item.y) <= 2) {
      fila.push(item);
    } else {
      if (fila?.[0].texto === "Total") break;
      filas.push([item]);
    }
  }
  return filas;
}

/**
 * Columna a la que pertenece una celda. Las cifras van alineadas a la derecha y los textos a la
 * izquierda, así que la celda cae en la última columna cuyo encabezado empieza antes que ella.
 */
function columnaDe<T extends string>(x: number, encabezados: { clave: T; x: number }[]): T | null {
  let elegida: T | null = null;
  for (const encabezado of encabezados) {
    if (encabezado.x <= x + 3) elegida = encabezado.clave;
  }
  return elegida;
}

function cifra(texto: string | undefined): number | null {
  if (texto === undefined) return null;
  const valor = leerCifra(texto);
  return valor === null || Number.isNaN(valor) ? null : valor;
}

function aIso(fecha: string): string {
  const [dia, mes, anio] = fecha.split("/");
  return `${anio}-${mes}-${dia}`;
}

/** El valor elegido en un filtro del tablero es el primer texto que sigue a su rótulo. */
function valorDeFiltro(items: ItemTexto[], rotulo: string): string | null {
  const indice = items.findIndex((item) => item.texto.trim() === rotulo);
  return indice >= 0 ? (items[indice + 1]?.texto.trim() ?? null) : null;
}

function leerCategorias(items: ItemTexto[], observaciones: string[]) {
  const inicio = items.findIndex((item) => item.texto.trim() === TITULO_CATEGORIAS);
  const [encabezado, ...filas] = filasDelBloque(items, inicio + 1);
  const x = (texto: string) => encabezado.find((item) => item.texto.trim() === texto)?.x;
  const columnas = [
    { clave: "ventas" as const, x: x("Ventas USD") ?? Infinity },
    { clave: "porcentajeImpreso" as const, x: x("% Venta") ?? Infinity },
    { clave: "unidades" as const, x: x("Unidades") ?? Infinity },
    { clave: "margen" as const, x: x("Margen (%)") ?? Infinity },
  ];

  const categorias: FilaCategoriaTienda[] = [];
  let total: LecturaCategoriasTienda["total"] = { ventas: null, unidades: null, margen: null };

  for (const fila of filas) {
    const [nombre, ...celdas] = [...fila].sort((a, b) => a.x - b.x);
    const valores: Record<string, number | null> = {};
    for (const celda of celdas) {
      const clave = columnaDe(celda.x, columnas);
      if (!clave) continue;
      const valor = cifra(celda.texto);
      if (valor === null) {
        observaciones.push(
          `${nombre.texto.trim()}: «${celda.texto}» no es una cifra; queda en blanco.`,
        );
      }
      valores[clave] = valor;
    }

    if (nombre.texto.trim() === "Total") {
      total = {
        ventas: valores.ventas ?? null,
        unidades: valores.unidades ?? null,
        margen: valores.margen ?? null,
      };
      continue;
    }

    categorias.push({
      categoria: nombre.texto.trim(),
      ventas: valores.ventas ?? null,
      porcentajeImpreso: valores.porcentajeImpreso ?? null,
      unidades: valores.unidades ?? null,
      margen: valores.margen ?? null,
    });
  }

  return { categorias, total };
}

function leerBajoCosto(items: ItemTexto[]): ProductoBajoCostoLeido[] {
  const inicio = items.findIndex((item) => item.texto.trim() === TITULO_BAJO_COSTO);
  const [encabezado, ...filas] = filasDelBloque(items, inicio + 1);
  const x = (texto: string) => encabezado.find((item) => item.texto.trim() === texto)?.x;
  // La columna de costo sale cortada en el PDF ("7," en vez del costo): no se lee.
  const columnas = [
    { clave: "sucursal" as const, x: x("Sucursal") ?? Infinity },
    { clave: "codigo" as const, x: x("barra") ?? Infinity },
    { clave: "producto" as const, x: x("Producto") ?? Infinity },
  ];
  const finProducto = Math.min(
    ...encabezado.filter((item) => item.x > (x("Producto") ?? Infinity)).map((item) => item.x),
  );

  const productos: ProductoBajoCostoLeido[] = [];
  for (const fila of filas) {
    if (fila[0].texto.trim() === "Total") continue;
    const valores: Partial<ProductoBajoCostoLeido> = {};
    for (const celda of fila) {
      if (celda.x >= finProducto - 3) continue;
      const clave = columnaDe(celda.x, columnas);
      if (clave) valores[clave] = celda.texto.trim();
    }
    if (valores.codigo && valores.producto) {
      productos.push({
        sucursal: valores.sucursal ?? "",
        codigo: valores.codigo,
        producto: valores.producto,
      });
    }
  }
  return productos;
}

/** "135 mil" → 135.000; "2 mill." → 2.000.000; una etiqueta cortada ("13 …") no se adivina. */
export function leerMagnitud(texto: string): number | null {
  const partes = texto.trim().match(/^([\d.,]+)\s*(mil|mill\.?|M)?$/i);
  if (!partes) return null;
  const base = Number(partes[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(base)) return null;
  const unidad = partes[2]?.toLowerCase();
  return unidad === "mil" ? base * 1_000 : unidad ? base * 1_000_000 : base;
}

/**
 * El top es un gráfico de barras: el nombre del producto a la izquierda y la etiqueta de la
 * barra a la derecha, a la misma altura. Las marcas del eje quedan debajo y no tienen nombre a
 * su altura, así que se descartan solas. El título dice 20, pero el PDF trae los que caben.
 */
function leerTop(items: ItemTexto[]): ProductoTopLeido[] {
  const inicio = items.findIndex((item) => item.texto.trim() === TITULO_TOP);
  if (inicio < 0) return [];
  const titulo = items[inicio];
  const bloque: ItemTexto[] = [];
  for (const item of items.slice(inicio + 1)) {
    if (item.y >= titulo.y) break;
    bloque.push(item);
  }

  const esEtiqueta = (texto: string) => /^[\d.,]+\s*(mil|mill\.?|M)?$|…$/i.test(texto.trim());
  const valores = bloque.filter((item) => esEtiqueta(item.texto) && /\d/.test(item.texto));
  const nombres = bloque.filter(
    (item) => !esEtiqueta(item.texto) || !/\d/.test(item.texto),
  ).filter((item) => !["Producto", "Ventas USD"].includes(item.texto.trim()));

  return nombres
    .filter((nombre) => valores.some((valor) => Math.abs(valor.y - nombre.y) <= 2))
    .sort((a, b) => b.y - a.y)
    .map((nombre, indice) => {
      const valor = valores.find((candidato) => Math.abs(candidato.y - nombre.y) <= 2)!;
      return {
        posicion: indice + 1,
        producto: nombre.texto.trim(),
        ventasAprox: leerMagnitud(valor.texto),
      };
    });
}

/**
 * ¿Es este producto del top uno de los que se venden bajo costo? El top corta los nombres
 * largos con "…", así que un nombre cortado casa por su comienzo.
 */
export function mismoProducto(delTop: string, completo: string) {
  const top = normalizarNombre(delTop.replace(/…$/, ""));
  const otro = normalizarNombre(completo);
  return delTop.trim().endsWith("…") ? otro.startsWith(top) : top === otro;
}

function normalizarNombre(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

export function leerCategoriasTienda(crudos: ItemTexto[]): LecturaCategoriasTienda {
  const items = limpiar(crudos);
  const observaciones: string[] = [];

  const { categorias, total } = leerCategorias(items, observaciones);
  const bajoCosto = leerBajoCosto(items);
  const topProductos = leerTop(items);

  const fechas = items.filter((item) => /^\d{2}\/\d{2}\/\d{4}$/.test(item.texto.trim()));
  const desde = fechas[0] ? aIso(fechas[0].texto.trim()) : null;
  const hasta = fechas[1] ? aIso(fechas[1].texto.trim()) : desde;

  // El filtro de sucursal sale cortado ("PUERTO O…"); la lista de productos trae el nombre
  // completo. Se prefiere la lista, y el filtro queda como respaldo.
  const filtroSucursal = valorDeFiltro(items, "sucursal");
  const sucursal =
    bajoCosto.find((producto) => producto.sucursal)?.sucursal ??
    (filtroSucursal ? filtroSucursal.replace(/…$/, "").trim() : null);

  const filtros = {
    categoria: valorDeFiltro(items, "Categoria"),
    procedencia: valorDeFiltro(items, "Procedencia"),
  };
  for (const [rotulo, valor] of Object.entries(filtros)) {
    if (valor && valor !== "Todas") {
      observaciones.push(
        `El reporte está filtrado por ${rotulo} = «${valor}»: la mezcla no es la de toda la tienda.`,
      );
    }
  }

  // La exportación a PDF solo imprime las filas visibles de una lista con scroll: en los
  // reportes de septiembre, las seis tiendas traen exactamente doce. Doce o más es una lista
  // que probablemente sigue, y se dice en vez de darla por completa.
  if (bajoCosto.length >= FILAS_VISIBLES_BAJO_COSTO) {
    observaciones.push(
      `La lista de productos vendidos a costo o por debajo trae ${bajoCosto.length} filas, las ` +
        `que caben en pantalla: puede haber más en el sistema.`,
    );
  }

  if (!categorias.length) {
    observaciones.push("No se encontró ninguna fila en la tabla de categorías.");
  }

  const suma = categorias.reduce((acumulado, fila) => acumulado + (fila.ventas ?? 0), 0);
  if (total.ventas && Math.abs(suma - total.ventas) > Math.max(5, total.ventas * 0.001)) {
    observaciones.push(
      `Las categorías suman ${Math.round(suma).toLocaleString("es-VE")} y el total impreso es ` +
        `${Math.round(total.ventas).toLocaleString("es-VE")}: falta o sobra una fila.`,
    );
  }

  return {
    tipo: "CATEGORIAS_TIENDA",
    sucursal,
    desde,
    hasta,
    filtros,
    categorias,
    total,
    bajoCosto,
    topProductos,
    observaciones,
  };
}

// ─── Lo impreso contra lo derivado ──────────────────────────────────────────

/** Diferencia en puntos porcentuales que ya no se explica por el redondeo a dos decimales. */
const TOLERANCIA_PUNTOS = 0.1;

/**
 * El "% Venta" del reporte no es la venta de la categoría entre el total: en los seis reportes
 * de septiembre, cárnicos y productos del campo salen por debajo de lo que da la cuenta y
 * cuidado personal y licores por encima, que es el patrón de un porcentaje calculado sobre otra
 * base (la venta con IVA, probablemente). No son treinta errores sino una definición distinta:
 * se dice una vez por corte, se nombra el patrón y la aplicación usa el derivado.
 */
export function conciliarPorcentajes(
  lectura: Pick<LecturaCategoriasTienda, "categorias" | "total">,
  tienda: string,
): AlertaDetectada | null {
  const total = lectura.total.ventas;
  if (!total) return null;

  const comparadas = lectura.categorias
    .filter((fila) => fila.ventas !== null && fila.porcentajeImpreso !== null)
    .map((fila) => {
      const derivado = (fila.ventas! / total) * 100;
      return { ...fila, derivado, diferencia: fila.porcentajeImpreso! - derivado };
    });
  const discrepantes = comparadas.filter((fila) => Math.abs(fila.diferencia) > TOLERANCIA_PUNTOS);
  if (!discrepantes.length) return null;

  const porDiferencia = [...discrepantes].sort((a, b) => a.diferencia - b.diferencia);
  const pct = (valor: number) => `${valor.toFixed(2).replace(".", ",")} %`;
  const describir = (fila: (typeof comparadas)[number]) =>
    `${fila.categoria} ${pct(fila.porcentajeImpreso!)} contra ${pct(fila.derivado)}`;
  const debajo = porDiferencia.filter((fila) => fila.diferencia < 0).slice(0, 2);
  const encima = porDiferencia
    .filter((fila) => fila.diferencia > 0)
    .slice(-2)
    .reverse();

  return {
    tipo: "INDICADOR_NO_CUADRA",
    severidad: "BAJA",
    tiendaId: null,
    indicador: "PCT_VENTA_CATEGORIA",
    valorObservado: discrepantes.length,
    valorEsperado: 0,
    mensaje:
      `El «% Venta» del reporte por categoría no es la venta de la categoría entre el total: ` +
      `difiere en ${discrepantes.length} de ${comparadas.length} categorías de ${tienda}` +
      (debajo.length ? `, por debajo en ${debajo.map(describir).join(" y ")}` : "") +
      (encima.length ? `, por encima en ${encima.map(describir).join(" y ")}` : "") +
      `. Un patrón así apunta a que el porcentaje se calcula sobre otra base —la venta con IVA, ` +
      `probablemente—, no a un error de captura. La aplicación usa el derivado.`,
  };
}

// ─── Productos vendidos a costo o por debajo ───────────────────────────────

export type ProductoEnTiendas = {
  codigo: string;
  producto: string;
  tiendas: string[];
};

/**
 * Qué productos aparecen vendidos a costo o por debajo en varias tiendas a la vez. Un producto
 * en una sola tienda es un problema de esa tienda; el mismo producto en casi todas es un precio
 * mal puesto para toda la cadena, y se corrige en un solo lugar.
 */
export function agruparBajoCosto(
  registros: { codigo: string; producto: string; tienda: string }[],
): ProductoEnTiendas[] {
  const porCodigo = new Map<string, ProductoEnTiendas>();
  for (const registro of registros) {
    const actual = porCodigo.get(registro.codigo) ?? {
      codigo: registro.codigo,
      producto: registro.producto,
      tiendas: [],
    };
    if (!actual.tiendas.includes(registro.tienda)) actual.tiendas.push(registro.tienda);
    porCodigo.set(registro.codigo, actual);
  }
  return [...porCodigo.values()].sort(
    (a, b) => b.tiendas.length - a.tiendas.length || a.producto.localeCompare(b.producto),
  );
}

/**
 * A partir de cuántas tiendas un producto bajo costo deja de ser un caso de tienda. Dos tiendas
 * todavía pueden ser coincidencia; tres ya apuntan a un precio o un costo cargado para todas.
 */
export const TIENDAS_PARA_CADENA = 3;

export function esProblemaDeCadena(tiendasConProducto: number) {
  return tiendasConProducto >= TIENDAS_PARA_CADENA;
}
