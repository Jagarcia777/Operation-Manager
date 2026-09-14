import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { AREAS_OPERATIVAS } from "../src/lib/areas";
import { TIPOLOGIAS } from "../src/lib/dominio";

try {
  process.loadEnvFile(".env");
} catch {
  // Sin archivo .env se usan las variables del entorno.
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/**
 * Con `--solo-catalogo` se siembra únicamente lo que la aplicación necesita para arrancar
 * —zonas, tiendas, categorías, umbrales, benchmarks y perfil— y solo si la base está vacía.
 * Es el modo que corre en cada despliegue, y por eso tiene que ser inofensivo al repetirse:
 * los upsert buscan por nombre, así que volver a sembrar sobre una zona ya renombrada crearía
 * un duplicado con el nombre viejo. Los cortes de ejemplo quedan fuera en este modo.
 */
const SOLO_CATALOGO = process.argv.includes("--solo-catalogo");

// Zona Oriente se gestiona tienda por tienda. Los nombres son los reales de la cadena; los alias
// recogen cómo aparece cada sucursal en otros reportes.
const ZONA_ORIENTE = {
  nombre: "Zona Oriente",
  gerente: "José García",
  orden: 1,
  detallada: true,
};

const TIENDAS_ORIENTE = [
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
const ZONA_RESTO = {
  nombre: "Resto de la cadena",
  gerente: "Por asignar",
  orden: 2,
  detallada: true,
};

const TIENDAS_RESTO = [
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
const CATEGORIAS = [
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
  { nombre: "Accesorios y Mantenimiento del Hogar", alias: "ACCESORIO Y MANTENIMIENTO DEL HOGAR" },
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
const CORTES = [
  {
    nombre: "Acumulado al 12/08/2026",
    tipo: "CIERRE_MES",
    fechaInicio: new Date("2026-08-01"),
    fechaFin: new Date("2026-08-12"),
    estado: "CERRADO",
    diasDelMes: 31,
    diasTranscurridos: 12,
    factor: 0.39,
  },
  {
    nombre: "Acumulado al 23/08/2026",
    tipo: "CIERRE_MES",
    fechaInicio: new Date("2026-08-01"),
    fechaFin: new Date("2026-08-23"),
    estado: "REVISION",
    diasDelMes: 31,
    diasTranscurridos: 23,
    factor: 0.74,
  },
];

// Peso de cada tipología sobre ventas, en el orden del reporte. Negativos porque son ajustes
// en contra; "Ventas" puede salir a favor.
const PESO_TIPOLOGIA: Record<string, number> = {
  MERMA: -1.07,
  MERCANCIA_DANADA: -0.06,
  CARGA_DESCARGA: -0.23,
  INVENTARIO: -0.17,
  VENTAS: 0.01,
};

/** Generador determinista: el seed produce siempre los mismos números. */
function pseudoAleatorio(semilla: number) {
  const x = Math.sin(semilla * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

async function main() {
  if (SOLO_CATALOGO && (await prisma.zona.count()) > 0) {
    console.log("El catálogo ya está cargado; no se toca nada.");
    return;
  }

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

  // Los cortes de ejemplo son relleno para que las pantallas no se vean vacías la primera
  // vez; el catálogo es lo que la aplicación necesita de verdad.
  if (!SOLO_CATALOGO) {
    await sembrarCortesDeEjemplo(tiendas, categorias);
  }

  const umbrales = await prisma.umbral.count();
  if (umbrales === 0) await sembrarUmbrales();
  await sembrarBenchmarks();
  await sembrarAreas();

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

  console.log(
    `Seed listo: Zona Oriente con ${tiendas.length} tiendas, ${TIENDAS_RESTO.length} sucursales de ` +
      `comparación y ${categorias.length} categorías` +
      (SOLO_CATALOGO ? " (sin cortes de ejemplo)." : `, más ${CORTES.length} cortes de ejemplo.`),
  );
}

/** Cortes inventados para que el tablero tenga algo que mostrar antes de la primera carga. */
async function sembrarCortesDeEjemplo(
  tiendas: { id: string; codigo: string | null }[],
  categorias: { id: string; nombre: string }[],
) {
  for (const definicion of CORTES) {
    const { factor, ...datos } = definicion;
    const corte = await prisma.corte.upsert({
      where: { nombre: datos.nombre },
      update: datos,
      create: datos,
    });

    // Zona Oriente, tienda por tienda.
    for (const [i, tienda] of tiendas.entries()) {
      const ventaMensual = 1_900_000 + pseudoAleatorio(i + 1) * 2_600_000;
      const ventasMeta = Math.round((ventaMensual * factor) / 100) * 100;
      const logro = 0.86 + pseudoAleatorio(i + 11) * 0.26;
      const ventasReal = Math.round((ventasMeta * logro) / 100) * 100;
      const rpt = 24 + pseudoAleatorio(i + 21) * 16;
      const transaccionesReal = Math.round(ventasReal / rpt);
      const unidadesReal = Math.round(transaccionesReal * (2.1 + pseudoAleatorio(i + 31) * 1.4));
      // El margen de supermercado se mueve en la franja baja; el reporte real marcó en rojo
      // las tiendas por debajo de 16%.
      const margenBrutoReal = Number((15 + pseudoAleatorio(i + 41) * 9).toFixed(2));

      await prisma.registroVentas.upsert({
        where: { corteId_tiendaId: { corteId: corte.id, tiendaId: tienda.id } },
        update: {},
        create: {
          corteId: corte.id,
          tiendaId: tienda.id,
          ventasMeta,
          ventasReal,
          unidadesMeta: Math.round(unidadesReal / logro),
          unidadesReal,
          transaccionesMeta: Math.round(transaccionesReal / logro),
          transaccionesReal,
          margenBrutoMeta: 22,
          margenBrutoReal,
        },
      });

      for (const [j, tipologia] of TIPOLOGIAS.entries()) {
        // Caso real del negocio: Carga y Descarga muy por encima del rango en Tipuro.
        const esAtipico =
          tienda.codigo === "TIP" &&
          tipologia === "CARGA_DESCARGA" &&
          corte.nombre === "Acumulado al 23/08/2026";
        const base = PESO_TIPOLOGIA[tipologia];
        const porcentaje = esAtipico
          ? -2.38
          : Number((base * (0.6 + pseudoAleatorio(i * 7 + j + 51) * 0.9)).toFixed(2));

        await prisma.registroAjuste.upsert({
          where: {
            corteId_tiendaId_tipologia: {
              corteId: corte.id,
              tiendaId: tienda.id,
              tipologia,
            },
          },
          update: {},
          create: {
            corteId: corte.id,
            tiendaId: tienda.id,
            tipologia,
            monto: Math.round((ventasReal * porcentaje) / 100),
            porcentaje,
          },
        });
      }

      // Detalle por categoría: la venta de la tienda repartida con pesos decrecientes.
      const pesos = categorias.map((_, indice) => 1 / (indice + 1.35));
      const sumaPesos = pesos.reduce((total, peso) => total + peso, 0);
      for (const [k, categoria] of categorias.entries()) {
        const ventaCategoria = Math.round((ventasReal * pesos[k]) / sumaPesos);
        // Carnicería es alta en venta y muy baja en margen: el caso que el negocio ya detectó.
        const margen =
          categoria.nombre === "Carnicería"
            ? Number((3 + pseudoAleatorio(i * 13 + k) * 2).toFixed(2))
            : Number((10 + pseudoAleatorio(i * 13 + k + 61) * 22).toFixed(2));

        await prisma.registroCategoria.upsert({
          where: {
            corteId_tiendaId_categoriaId: {
              corteId: corte.id,
              tiendaId: tienda.id,
              categoriaId: categoria.id,
            },
          },
          update: {},
          create: {
            corteId: corte.id,
            tiendaId: tienda.id,
            categoriaId: categoria.id,
            ventasReal: ventaCategoria,
            unidadesReal: Math.round(ventaCategoria / (6 + pseudoAleatorio(k + 71) * 10)),
            margenBrutoReal: margen,
          },
        });
      }
    }
  }
}

async function sembrarUmbrales() {
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
async function sembrarBenchmarks() {
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
 * Áreas de la tienda con su KPI y su rango de referencia. A diferencia de los benchmarks, aquí
 * el valor sí viene cargado: es la referencia internacional publicada, no una meta del negocio.
 * El usuario la calibra desde Configuración cuando tenga histórico propio.
 */
async function sembrarAreas() {
  for (const [indice, area] of AREAS_OPERATIVAS.entries()) {
    await prisma.areaOperativa.upsert({
      where: { nombre: area.nombre },
      update: { orden: indice + 1 },
      create: { ...area, usaVentaTienda: area.usaVentaTienda ?? false, orden: indice + 1 },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
