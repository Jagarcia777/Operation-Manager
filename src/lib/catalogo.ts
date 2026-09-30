import type { PrismaClient } from "@/generated/prisma/client";
import { AREAS_OPERATIVAS } from "@/lib/areas";

// El catálogo real de la cadena: las zonas, las 25 sucursales con la grafía del sistema emisor,
// las categorías del Resumen Ejecutivo, las áreas de la plantilla, los umbrales de alerta y los
// benchmarks por cargar. Lo usan el despliegue (prisma/seed.ts) y la acción de Configuración
// que deja la aplicación lista para empezar con datos reales.

type Cliente = PrismaClient;

// Zona Oriente se gestiona tienda por tienda. Los nombres son los reales de la cadena; los alias
// recogen cómo aparece cada sucursal en otros reportes.
export const ZONA_ORIENTE = {
  nombre: "Zona Oriente",
  gerente: "José García",
  orden: 1,
  detallada: true,
};

export const TIENDAS_ORIENTE = [
  { nombre: "Puerto Ordaz", codigo: "PZO", alias: "Pto Ordaz\nPto. Ordaz" },
  { nombre: "Plaza Mayor", codigo: "PLM", alias: "SUC. LECHERIA\nLechería" },
  { nombre: "Maturín Tipuro", codigo: "TIP", alias: "Tipuro\nMaturin Tipuro" },
  { nombre: "Maturín Juanico", codigo: "JUA", alias: "Juanico\nMaturin Juanico" },
  { nombre: "Puente Real", codigo: "PRE", alias: "Pte Real" },
  { nombre: "Valle de la Pascua", codigo: "VDLP", alias: "VDLP\nValle de la pascua" },
];

// El resto de la cadena, sucursal por sucursal tal como la nombra el Resumen Ejecutivo. Antes
// entraba como cinco totales de zona porque solo llegaba el agregado; el informe las trae todas
// abiertas, así que la comparación se hace contra el detalle real y no contra una estimación.
// La asignación por zona queda para que el usuario la reparta desde Configuración: el informe
// no dice a qué zona pertenece cada sucursal y la aplicación no lo adivina.
export const ZONA_RESTO = {
  nombre: "Resto de la cadena",
  gerente: "Por asignar",
  orden: 2,
  detallada: true,
};

export const TIENDAS_RESTO = [
  { nombre: "Lomas del Sol", alias: "LOMAS DEL SOL" },
  { nombre: "La Candelaria", alias: "LA CANDELARIA" },
  { nombre: "Barquisimeto", alias: "BARQUISIMETO" },
  { nombre: "Cigarral - El Hatillo", alias: "CIGARRAL-EL HATILLO\nCIGARRAL EL HATILLO" },
  { nombre: "Guatire", alias: "GUATIRE" },
  { nombre: "Charallave", alias: "CHARALLAVE" },
  { nombre: "Playa El Ángel", alias: "PLAYA EL ANGEL" },
  { nombre: "Guarenas", alias: "GUARENAS" },
  { nombre: "El Recreo", alias: "EL RECREO" },
  { nombre: "Los Campitos", alias: "LOS CAMPITOS" },
  { nombre: "El Paraíso", alias: "EL PARAISO" },
  { nombre: "31 de Julio", alias: "31 DE JULIO" },
  { nombre: "Juan Bautista Arismendi", alias: "JUAN BAUTISTA ARISMENDI" },
  { nombre: "Juan Griego", alias: "JUAN GRIEGO" },
  { nombre: "Terranova", alias: "TERRANOVA" },
  { nombre: "Sambil", alias: "SAMBIL" },
  { nombre: "El Marqués", alias: "EL MARQUES" },
  { nombre: "Los Palos Grandes", alias: "LOS PALOS GRANDES" },
  // No es una sucursal: es un canal. Suma al total de la cadena pero no compite con las tiendas.
  { nombre: "Ventas Corporativas", alias: "VENTAS CORPORATIVAS", comparable: false },
];

// Categorías de venta tal como las publica el Resumen Ejecutivo de la cadena, en su orden de
// peso. El alias recoge la grafía exacta del sistema emisor para que la lectura automática las
// reconozca sin tener que renombrarlas aquí.
export const CATEGORIAS = [
  { nombre: "Cárnicos", alias: "CARNICOS" },
  { nombre: "Víveres", alias: "VIVERES" },
  { nombre: "Cesta Básica", alias: "CESTA BASICA" },
  { nombre: "Productos del Campo", alias: "PRODUCTOS DEL CAMPO" },
  { nombre: "Charcutería", alias: "CHARCUTERIA" },
  { nombre: "Licores", alias: "LICORES" },
  { nombre: "Cuidado Personal", alias: "CUIDADO PERSONAL" },
  { nombre: "Carnicería", alias: "CARNICERIA" },
  { nombre: "Refrigerado", alias: "REFRIGERADO" },
  { nombre: "Bebidas No Alcohólicas", alias: "BEBIDAS NO ALCOHOLICAS" },
  {
    nombre: "Accesorios y Mantenimiento del Hogar",
    // El libro de ajustes la abrevia.
    alias: "ACCESORIO Y MANTENIMIENTO DEL HOGAR\nACCESORIO Y MANT HOGAR",
  },
  { nombre: "Galletas y Meriendas", alias: "GALLETAS Y MERIENDAS" },
  { nombre: "Frutos Secos", alias: "FRUTO SECOS" },
  { nombre: "Cuidado de la Ropa", alias: "CUIDADO DE LA ROPA" },
  { nombre: "Restaurante", alias: "RESTAURANTE" },
  { nombre: "Congelados", alias: "CONGELADOS" },
  { nombre: "Panificadora", alias: "PANIFICADORA" },
  { nombre: "Snacks", alias: "SNACKS" },
  { nombre: "Impulsivos", alias: "IMPULSIVOS" },
  { nombre: "RX", alias: "RX" },
  { nombre: "Productos Infantiles", alias: "PRODUCTOS INFANTILES" },
  { nombre: "OTC", alias: "OTC" },
  { nombre: "Mascotas", alias: "MASCOTAS" },
  { nombre: "Fiesta", alias: "FIESTA" },
  { nombre: "Electrodomésticos", alias: "ELECTRODOMESTICO" },
  { nombre: "Cigarrillos", alias: "CIGARRILLOS" },
  { nombre: "Papelería", alias: "PAPELERIA" },
  { nombre: "Ferreauto", alias: "FERREAUTO" },
  { nombre: "Mezcladores", alias: "MEZCLADORES" },
];

// Los cortes de la cadena son acumulados al día, no meses cerrados.
/**
 * Siembra el catálogo completo sobre una base vacía o lo pone al día sobre una ya sembrada con
 * él: busca por nombre, así que no duplica. Devuelve lo que el seed necesita para colgar de ahí
 * los cortes de ejemplo.
 */
export async function sembrarCatalogo(prisma: Cliente) {
  const oriente = await prisma.zona.upsert({
    where: { nombre: ZONA_ORIENTE.nombre },
    update: ZONA_ORIENTE,
    create: ZONA_ORIENTE,
  });

  const resto = await prisma.zona.upsert({
    where: { nombre: ZONA_RESTO.nombre },
    update: ZONA_RESTO,
    create: ZONA_RESTO,
  });

  const tiendas = [];
  for (const [indice, tienda] of TIENDAS_ORIENTE.entries()) {
    tiendas.push(
      await prisma.tienda.upsert({
        where: { nombre: tienda.nombre },
        update: { ...tienda, zonaId: oriente.id, orden: indice + 1 },
        create: { ...tienda, zonaId: oriente.id, orden: indice + 1 },
      }),
    );
  }

  for (const [indice, tienda] of TIENDAS_RESTO.entries()) {
    await prisma.tienda.upsert({
      where: { nombre: tienda.nombre },
      update: { ...tienda, zonaId: resto.id, orden: indice + 1 },
      create: { ...tienda, zonaId: resto.id, orden: indice + 1 },
    });
  }

  const categorias = [];
  for (const [indice, categoria] of CATEGORIAS.entries()) {
    categorias.push(
      await prisma.categoria.upsert({
        where: { nombre: categoria.nombre },
        update: { orden: indice + 1, alias: categoria.alias ?? null },
        create: { ...categoria, alias: categoria.alias ?? null, orden: indice + 1 },
      }),
    );
  }

  const umbrales = await prisma.umbral.count();
  if (umbrales === 0) await sembrarUmbrales(prisma);
  await sembrarBenchmarks(prisma);
  await sembrarAreas(prisma);

  // La marca solo se rellena si aún no está definida: lo que el usuario edite manda.
  const perfilExistente = await prisma.perfil.findUnique({ where: { id: "maestro" } });

  await prisma.perfil.upsert({
    where: { id: "maestro" },
    update: {
      zonaPropiaId: oriente.id,
      ...(perfilExistente?.marca ? {} : { marca: "JG Operaciones" }),
      ...(perfilExistente?.iniciales ? {} : { iniciales: "JG" }),
    },
    create: {
      id: "maestro",
      nombre: "José García",
      cargo: "Director de Operaciones",
      marca: "JG Operaciones",
      iniciales: "JG",
      zonaPropiaId: oriente.id,
      contexto:
        "Gestiono las 6 tiendas de Zona Oriente de Rio Supermarket y las comparo contra la " +
        "cadena nacional. Mantengo el Tablero de Control de Ventas y el Reporte de Ajustes por " +
        "Tipología corte a corte, detecto inconsistencias en la data fuente y convierto los " +
        "números en presentaciones de tienda, informes ejecutivos y planes de acción.",
      instruccionesCerebro:
        "Analiza con criterio de director de operaciones retail: crítico, preciso y orientado a " +
        "ejecución en tienda. Usa benchmarks internacionales de supermercado (NRF/IGD), prioriza " +
        "por $ de oportunidad, separa causa raíz de síntoma y di explícitamente qué no se puede " +
        "concluir con los datos disponibles.",
    },
  });

  return { oriente, tiendas, categorias };
}

async function sembrarUmbrales(prisma: Cliente) {
  const umbrales = [
    {
      clave: "CUMPLIMIENTO_MIN",
      etiqueta: "Cumplimiento mínimo antes de sospechar del dato",
      valor: 50,
      unidad: "PORCENTAJE",
      nota: "Por debajo de este logro se revisa si el dato está mal cargado.",
    },
    {
      clave: "CUMPLIMIENTO_MAX",
      etiqueta: "Cumplimiento máximo antes de sospechar del dato",
      valor: 150,
      unidad: "PORCENTAJE",
      nota: "Por encima de este logro se revisa un posible Meta/Real intercambiado.",
    },
    {
      clave: "AJUSTE_MAX_PCT",
      etiqueta: "Ajuste máximo aceptable por tipología (% sobre ventas)",
      valor: 1.2,
      unidad: "PORCENTAJE",
      nota: "Referencia del negocio para Merma, Carga y Descarga y demás tipologías.",
    },
    {
      clave: "FACTOR_ATIPICO",
      etiqueta: "Factor de desviación para marcar un valor atípico",
      valor: 3,
      unidad: "FACTOR",
      nota: "Múltiplos de desviación respecto a la mediana de la cadena.",
    },
    {
      clave: "SALTO_MAX_PCT",
      etiqueta: "Variación máxima razonable contra el corte anterior",
      valor: 40,
      unidad: "PORCENTAJE",
    },
    {
      clave: "TOLERANCIA_SUBTOTAL",
      etiqueta: "Tolerancia al comparar un subtotal externo con la suma calculada",
      valor: 1,
      unidad: "USD",
    },
    {
      clave: "MARGEN_MIN_PCT",
      etiqueta: "Margen bruto mínimo aceptable de una tienda",
      valor: 16,
      unidad: "PORCENTAJE",
      nota: "Por debajo de este %MB la tienda entra en alerta roja.",
    },
  ];

  for (const umbral of umbrales) {
    await prisma.umbral.upsert({
      where: { clave: umbral.clave },
      update: {},
      create: umbral,
    });
  }
}

/**
 * Los benchmarks se crean sin valor a propósito: son referencias del negocio y las carga el
 * usuario desde Configuración. La aplicación no se inventa un estándar internacional.
 */
async function sembrarBenchmarks(prisma: Cliente) {
  const benchmarks = [
    { clave: "MB_PCT", etiqueta: "Margen bruto", unidad: "PORCENTAJE", fuente: "NRF/IGD" },
    { clave: "UPT", etiqueta: "Unidades por transacción", unidad: "FACTOR", fuente: "NRF/IGD" },
    { clave: "RPT", etiqueta: "Ticket promedio (RPT)", unidad: "USD", fuente: "NRF/IGD" },
    { clave: "ASP", etiqueta: "Precio medio por unidad (ASP)", unidad: "USD", fuente: "NRF/IGD" },
    { clave: "MERMA_PCT", etiqueta: "Merma sobre ventas", unidad: "PORCENTAJE", fuente: "NRF/IGD" },
    {
      clave: "AJUSTES_PCT",
      etiqueta: "Ajustes totales sobre ventas",
      unidad: "PORCENTAJE",
      fuente: "Interno",
    },
  ];

  for (const benchmark of benchmarks) {
    await prisma.benchmark.upsert({
      where: { clave: benchmark.clave },
      update: {},
      create: { ...benchmark, nota: "Cargar el valor de referencia en Configuración." },
    });
  }
}

/**
 * Una base ya instalada no se vuelve a sembrar: lo que se editó en Configuración manda. Pero el
 * catálogo creció después de la primera instalación —las 19 sucursales del resto de la cadena,
 * las 29 categorías del Resumen Ejecutivo con sus alias, las áreas de la plantilla— y sin eso
 * la lectura de los informes no reconoce la mitad de las filas. Aquí solo se agrega lo que
 * falta y se rellenan alias vacíos; nada se borra, se renombra ni se sobrescribe.
 */
export async function completarCatalogo(prisma: Cliente) {
  const agregados: string[] = [];

  const zonaPropia =
    (await prisma.zona.findUnique({ where: { nombre: ZONA_ORIENTE.nombre } })) ??
    (await prisma.perfil.findUnique({ where: { id: "maestro" }, include: { zonaPropia: true } }))
      ?.zonaPropia;
  let resto = await prisma.zona.findUnique({ where: { nombre: ZONA_RESTO.nombre } });
  if (!resto) {
    const ultima = await prisma.zona.aggregate({ _max: { orden: true } });
    resto = await prisma.zona.create({
      data: { ...ZONA_RESTO, orden: (ultima._max.orden ?? 0) + 1 },
    });
    agregados.push(`zona ${ZONA_RESTO.nombre}`);
  }

  const bloques = [
    { zonaId: zonaPropia?.id, tiendas: TIENDAS_ORIENTE },
    { zonaId: resto.id, tiendas: TIENDAS_RESTO },
  ];
  for (const { zonaId, tiendas } of bloques) {
    if (!zonaId) continue;
    for (const [indice, tienda] of tiendas.entries()) {
      const codigo = "codigo" in tienda ? tienda.codigo : undefined;
      const existente = await prisma.tienda.findFirst({
        where: { OR: [{ nombre: tienda.nombre }, ...(codigo ? [{ codigo }] : [])] },
      });
      if (!existente) {
        await prisma.tienda.create({ data: { ...tienda, zonaId, orden: indice + 1 } });
        agregados.push(tienda.nombre);
      } else if (!existente.alias && tienda.alias) {
        await prisma.tienda.update({ where: { id: existente.id }, data: { alias: tienda.alias } });
      }
    }
  }

  const ultimaCategoria = await prisma.categoria.aggregate({ _max: { orden: true } });
  let orden = ultimaCategoria._max.orden ?? 0;
  for (const categoria of CATEGORIAS) {
    const existente = await prisma.categoria.findUnique({ where: { nombre: categoria.nombre } });
    if (!existente) {
      orden += 1;
      await prisma.categoria.create({ data: { ...categoria, alias: categoria.alias ?? null, orden } });
      agregados.push(categoria.nombre);
    } else if (!existente.alias && categoria.alias) {
      await prisma.categoria.update({
        where: { id: existente.id },
        data: { alias: categoria.alias },
      });
    }
  }

  const areasAntes = await prisma.areaOperativa.count();
  if (areasAntes < AREAS_OPERATIVAS.length) {
    for (const [indice, area] of AREAS_OPERATIVAS.entries()) {
      const existente = await prisma.areaOperativa.findUnique({ where: { nombre: area.nombre } });
      if (existente) continue;
      await prisma.areaOperativa.create({
        data: { ...area, usaVentaTienda: area.usaVentaTienda ?? false, orden: indice + 1 },
      });
      agregados.push(`área ${area.nombre}`);
    }
  }
  if ((await prisma.umbral.count()) === 0) await sembrarUmbrales(prisma);

  console.log(
    agregados.length
      ? `Catálogo completado, sin tocar lo existente: ${agregados.length} altas (${agregados.join(", ")}).`
      : "El catálogo ya está completo; no se toca nada.",
  );
}

/**
 * Áreas de la tienda con su KPI y su rango de referencia. A diferencia de los benchmarks, aquí
 * el valor sí viene cargado: es la referencia internacional publicada, no una meta del negocio.
 * El usuario la calibra desde Configuración cuando tenga histórico propio.
 */
async function sembrarAreas(prisma: Cliente) {
  for (const [indice, area] of AREAS_OPERATIVAS.entries()) {
    await prisma.areaOperativa.upsert({
      where: { nombre: area.nombre },
      update: { orden: indice + 1 },
      create: { ...area, usaVentaTienda: area.usaVentaTienda ?? false, orden: indice + 1 },
    });
  }
}

