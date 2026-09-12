import { TIPOLOGIAS } from "@/lib/dominio";
import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Cadena de demostración. Nada de esto es real: sirve para recorrer la aplicación llena, con
 * un año de historia y con tiendas que se comportan distinto entre sí, que es lo que hace
 * interesante el análisis. Las cifras están calibradas contra un supermercado de tamaño medio.
 */

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Estacionalidad del consumo de alimentos: diciembre manda, enero es el castigo. */
const ESTACIONALIDAD = [0.86, 0.90, 0.98, 1.00, 1.05, 1.02, 1.06, 1.00, 0.99, 1.02, 1.08, 1.35];

const ZONA_PROPIA = {
  nombre: "Zona Metropolitana",
  gerente: "José García",
  orden: 1,
  detallada: true,
};

const ZONAS_COMPARACION = [
  { nombre: "Zona Norte", gerente: "Marisol Peña", orden: 2, detallada: false, tiendas: 5, base: 1_480_000 },
  { nombre: "Zona Centro", gerente: "Aníbal Cortés", orden: 3, detallada: false, tiendas: 6, base: 1_620_000 },
  { nombre: "Zona Andina", gerente: "Rebeca Duarte", orden: 4, detallada: false, tiendas: 4, base: 1_350_000 },
  { nombre: "Zona Llanos", gerente: "Tomás Alcántara", orden: 5, detallada: false, tiendas: 3, base: 1_180_000 },
  { nombre: "Zona Sur", gerente: "Carolina Vieira", orden: 6, detallada: false, tiendas: 5, base: 1_540_000 },
];

/**
 * Cada tienda con un carácter propio, para que el análisis tenga algo que decir:
 * una insignia fuerte, una de mucho tráfico y ticket bajo, una estacional de costa,
 * una con problema de margen, una recién abierta que todavía rampa, y una pequeña impecable.
 */
const TIENDAS = [
  {
    nombre: "Vega Altamira", codigo: "ALT", ciudad: "San Bernardo", formato: "Hipermercado",
    metrosCuadrados: 3200, aperturaHaceMeses: 96,
    base: 2_950_000, rpt: 36.5, upt: 3.1, margen: 22.8, logro: 1.04,
    merma: 0.95, dañada: 0.05, carga: 0.19, inventario: 0.14,
    alias: "Altamira\nSUC. ALTAMIRA",
  },
  {
    nombre: "Vega Los Robles", codigo: "ROB", ciudad: "San Bernardo", formato: "Supermercado",
    metrosCuadrados: 1850, aperturaHaceMeses: 72,
    base: 2_180_000, rpt: 24.2, upt: 2.4, margen: 20.1, logro: 1.01,
    merma: 1.18, dañada: 0.07, carga: 0.24, inventario: 0.18,
    alias: "Los Robles\nSUC. ROBLES",
  },
  {
    nombre: "Vega Costa Verde", codigo: "CVE", ciudad: "Puerto Lindo", formato: "Supermercado",
    metrosCuadrados: 2100, aperturaHaceMeses: 54,
    base: 1_920_000, rpt: 31.8, upt: 2.8, margen: 21.4, logro: 0.98,
    merma: 1.05, dañada: 0.06, carga: 0.28, inventario: 0.21,
    estacional: true,
    alias: "Costa Verde\nCOSTAVERDE",
  },
  {
    nombre: "Vega San Marcos", codigo: "SMA", ciudad: "San Marcos", formato: "Supermercado",
    metrosCuadrados: 1620, aperturaHaceMeses: 63,
    base: 1_640_000, rpt: 22.6, upt: 2.2, margen: 16.9, logro: 0.93,
    merma: 1.84, dañada: 0.11, carga: 0.38, inventario: 0.42,
    alias: "San Marcos\nSUC. SAN MARCOS",
  },
  {
    nombre: "Vega Puerto Nuevo", codigo: "PNU", ciudad: "Puerto Lindo", formato: "Supermercado",
    metrosCuadrados: 1740, aperturaHaceMeses: 5,
    base: 1_120_000, rpt: 26.9, upt: 2.5, margen: 19.2, logro: 0.96,
    merma: 1.32, dañada: 0.09, carga: 0.31, inventario: 0.26,
    rampa: true,
    alias: "Puerto Nuevo\nPTO NUEVO",
  },
  {
    nombre: "Vega Mirador", codigo: "MIR", ciudad: "El Mirador", formato: "Exprés",
    metrosCuadrados: 980, aperturaHaceMeses: 41,
    base: 1_310_000, rpt: 29.4, upt: 2.6, margen: 23.6, logro: 1.06,
    merma: 0.78, dañada: 0.04, carga: 0.16, inventario: 0.11,
    alias: "Mirador\nSUC. MIRADOR",
  },
];

/** Mezcla de categorías de un supermercado de alimentos, con su peso y su margen típico. */
const CATEGORIAS = [
  { nombre: "Víveres", peso: 0.208, margen: 17.4 },
  { nombre: "Carnicería", peso: 0.152, margen: 12.8 },
  { nombre: "Frutas y Verduras", peso: 0.104, margen: 26.5 },
  { nombre: "Lácteos", peso: 0.098, margen: 18.2 },
  { nombre: "Bebidas", peso: 0.092, margen: 21.7 },
  { nombre: "Charcutería", peso: 0.078, margen: 24.1 },
  { nombre: "Panadería", peso: 0.064, margen: 38.6 },
  { nombre: "Limpieza", peso: 0.058, margen: 22.9 },
  { nombre: "Congelados", peso: 0.046, margen: 23.4 },
  { nombre: "Cuidado Personal", peso: 0.041, margen: 27.8 },
  { nombre: "Licores", peso: 0.032, margen: 19.6 },
  { nombre: "Bazar", peso: 0.017, margen: 31.2 },
  { nombre: "Mascotas", peso: 0.010, margen: 25.3 },
];

/** Ruido reproducible: el demo tiene que verse igual cada vez que se carga. */
function ruido(semilla: number) {
  const x = Math.sin(semilla * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Variación centrada en 1 con la amplitud pedida. */
function variar(semilla: number, amplitud: number) {
  return 1 + (ruido(semilla) - 0.5) * 2 * amplitud;
}

const redondear = (valor: number, paso = 100) => Math.round(valor / paso) * paso;

export type ResumenDemo = {
  cortes: number;
  tiendas: number;
  registros: number;
  meses: string;
};

export async function generarDemo(prisma: PrismaClient): Promise<ResumenDemo> {
  await vaciarDatos(prisma);

  // ── Catálogo ────────────────────────────────────────────────────────────────
  const zonaPropia = await prisma.zona.create({ data: ZONA_PROPIA });

  const zonasComparacion = [];
  for (const zona of ZONAS_COMPARACION) {
    const { tiendas, base, ...datos } = zona;
    zonasComparacion.push({
      ...(await prisma.zona.create({ data: datos })),
      tiendasDeclaradas: tiendas,
      base,
    });
  }

  const hoy = new Date();
  const tiendas = [];
  for (const [indice, tienda] of TIENDAS.entries()) {
    const apertura = new Date(hoy);
    apertura.setMonth(apertura.getMonth() - tienda.aperturaHaceMeses);
    tiendas.push({
      perfil: tienda,
      fila: await prisma.tienda.create({
        data: {
          nombre: tienda.nombre,
          codigo: tienda.codigo,
          alias: tienda.alias,
          ciudad: tienda.ciudad,
          formato: tienda.formato,
          metrosCuadrados: tienda.metrosCuadrados,
          fechaApertura: apertura,
          zonaId: zonaPropia.id,
          orden: indice + 1,
        },
      }),
    });
  }

  const categorias = [];
  for (const [indice, categoria] of CATEGORIAS.entries()) {
    categorias.push({
      perfil: categoria,
      fila: await prisma.categoria.create({
        data: { nombre: categoria.nombre, orden: indice + 1 },
      }),
    });
  }

  // ── Doce cierres de mes, del más viejo al más reciente ──────────────────────
  const cortes = [];
  for (let atras = 12; atras >= 1; atras--) {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - atras, 1);
    const fin = new Date(hoy.getFullYear(), hoy.getMonth() - atras + 1, 0);
    const diasDelMes = fin.getDate();
    cortes.push(
      await prisma.corte.create({
        data: {
          nombre: `${MESES[inicio.getMonth()]} ${inicio.getFullYear()}`,
          tipo: "CIERRE_MES",
          fechaInicio: inicio,
          fechaFin: fin,
          estado: "CERRADO",
          diasDelMes,
          diasTranscurridos: diasDelMes,
        },
      }),
    );
  }

  // Y el mes en curso, abierto, con dos cortes acumulados: es el que se trabaja.
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  const diaHoy = Math.max(hoy.getDate(), 14);
  const corteMedio = await prisma.corte.create({
    data: {
      nombre: `Acumulado al ${String(Math.floor(diaHoy / 2)).padStart(2, "0")}/${String(inicioMes.getMonth() + 1).padStart(2, "0")}`,
      tipo: "SEMANAL",
      fechaInicio: inicioMes,
      fechaFin: new Date(hoy.getFullYear(), hoy.getMonth(), Math.floor(diaHoy / 2)),
      estado: "CERRADO",
      diasDelMes: finMes.getDate(),
      diasTranscurridos: Math.floor(diaHoy / 2),
    },
  });
  const corteActual = await prisma.corte.create({
    data: {
      nombre: `Acumulado al ${String(diaHoy).padStart(2, "0")}/${String(inicioMes.getMonth() + 1).padStart(2, "0")}`,
      tipo: "SEMANAL",
      fechaInicio: inicioMes,
      fechaFin: new Date(hoy.getFullYear(), hoy.getMonth(), diaHoy),
      estado: "REVISION",
      diasDelMes: finMes.getDate(),
      diasTranscurridos: diaHoy,
    },
  });

  const todos = [
    ...cortes.map((corte, i) => ({ corte, mesIndice: i, fraccion: 1 })),
    { corte: corteMedio, mesIndice: 12, fraccion: Math.floor(diaHoy / 2) / finMes.getDate() },
    { corte: corteActual, mesIndice: 12, fraccion: diaHoy / finMes.getDate() },
  ];

  const ventas = [];
  const ajustes = [];
  const registrosCategoria = [];
  const registrosZona = [];

  for (const { corte, mesIndice, fraccion } of todos) {
    const mesCalendario = corte.fechaInicio.getMonth();
    const estacion = ESTACIONALIDAD[mesCalendario];
    // La cadena crece ~0,6 % al mes; el índice 0 es el mes más viejo.
    const crecimiento = 1 + mesIndice * 0.006;

    for (const [indiceTienda, { perfil, fila }] of tiendas.entries()) {
      const semilla = mesIndice * 17 + indiceTienda * 3 + 1;

      // Una tienda recién abierta no vende como una madura: rampa hasta el mes seis.
      const mesesAbierta = perfil.aperturaHaceMeses - (12 - mesIndice);
      if (mesesAbierta < 0) continue;
      const rampa = perfil.rampa ? Math.min(1, 0.42 + mesesAbierta * 0.11) : 1;

      // La de costa vive del verano y de diciembre; el resto sigue la estacionalidad normal.
      const estacionTienda = perfil.estacional
        ? estacion * (mesCalendario === 11 || mesCalendario === 6 || mesCalendario === 7 ? 1.18 : 0.95)
        : estacion;

      const mensual = perfil.base * estacionTienda * crecimiento * rampa;
      const ventasMeta = redondear(mensual * fraccion * variar(semilla + 101, 0.015));
      const logro = perfil.logro * variar(semilla + 202, 0.055);
      const ventasReal = redondear(ventasMeta * logro);

      const rpt = perfil.rpt * variar(semilla + 303, 0.04);
      const transaccionesReal = Math.round(ventasReal / rpt);
      const upt = perfil.upt * variar(semilla + 404, 0.035);
      const unidadesReal = Math.round(transaccionesReal * upt);
      const margenReal = Number((perfil.margen * variar(semilla + 505, 0.045)).toFixed(2));

      ventas.push({
        corteId: corte.id,
        tiendaId: fila.id,
        ventasMeta,
        ventasReal,
        transaccionesMeta: Math.round(transaccionesReal / logro),
        transaccionesReal,
        unidadesMeta: Math.round((transaccionesReal / logro) * perfil.upt),
        unidadesReal,
        margenBrutoMeta: Number((perfil.margen + 0.8).toFixed(2)),
        margenBrutoReal: margenReal,
        origen: "MANUAL",
      });

      // Ajustes: van en negativo por ser en contra, salvo Ventas, que puede salir a favor.
      const pesos: Record<string, number> = {
        MERMA: -perfil.merma,
        MERCANCIA_DANADA: -perfil.dañada,
        CARGA_DESCARGA: -perfil.carga,
        INVENTARIO: -perfil.inventario,
        VENTAS: 0,
      };
      for (const [indiceTipo, tipologia] of TIPOLOGIAS.entries()) {
        const base = pesos[tipologia];
        const porcentaje =
          tipologia === "VENTAS"
            ? Number(((ruido(semilla + 700 + indiceTipo) - 0.45) * 0.05).toFixed(4))
            : Number((base * variar(semilla + 800 + indiceTipo, 0.22)).toFixed(4));
        ajustes.push({
          corteId: corte.id,
          tiendaId: fila.id,
          tipologia,
          monto: Math.round((ventasReal * porcentaje) / 100),
          porcentaje,
          origen: "MANUAL",
        });
      }

      // El detalle por categoría solo en los últimos seis cortes: más atrás nadie lo consulta
      // y multiplicar 13 categorías por 6 tiendas por 14 cortes solo engorda la base.
      if (mesIndice >= 8) {
        for (const [indiceCat, categoria] of categorias.entries()) {
          const ventaCategoria = redondear(
            ventasReal * categoria.perfil.peso * variar(semilla + 900 + indiceCat, 0.12),
            10,
          );
          registrosCategoria.push({
            corteId: corte.id,
            tiendaId: fila.id,
            categoriaId: categoria.fila.id,
            ventasReal: ventaCategoria,
            unidadesReal: Math.round(ventaCategoria / (4 + ruido(semilla + indiceCat) * 9)),
            margenBrutoReal: Number(
              (categoria.perfil.margen * variar(semilla + 950 + indiceCat, 0.13)).toFixed(2),
            ),
            origen: "MANUAL",
          });
        }
      }
    }

    for (const [indiceZona, zona] of zonasComparacion.entries()) {
      const semilla = mesIndice * 23 + indiceZona * 7 + 5;
      const mensual = zona.base * zona.tiendasDeclaradas * estacion * crecimiento;
      const ventasMeta = redondear(mensual * fraccion * variar(semilla + 11, 0.02));
      const logro = 0.99 * variar(semilla + 22, 0.05);
      const ventasReal = redondear(ventasMeta * logro);
      const rpt = 27 + ruido(semilla + 33) * 9;
      const transaccionesReal = Math.round(ventasReal / rpt);

      registrosZona.push({
        corteId: corte.id,
        zonaId: zona.id,
        ventasMeta,
        ventasReal,
        transaccionesMeta: Math.round(transaccionesReal / logro),
        transaccionesReal,
        unidadesMeta: Math.round(transaccionesReal * 2.55),
        unidadesReal: Math.round(transaccionesReal * (2.3 + ruido(semilla + 44) * 0.5)),
        margenBrutoMeta: 21.5,
        margenBrutoReal: Number((19.4 + ruido(semilla + 55) * 3.4).toFixed(2)),
        origen: "MANUAL",
      });
    }
  }

  await prisma.registroVentas.createMany({ data: ventas });
  await prisma.registroAjuste.createMany({ data: ajustes });
  await prisma.registroZona.createMany({ data: registrosZona });
  for (let i = 0; i < registrosCategoria.length; i += 500) {
    await prisma.registroCategoria.createMany({ data: registrosCategoria.slice(i, i + 500) });
  }

  await sembrarUmbrales(prisma);
  await sembrarBenchmarks(prisma);
  await sembrarPerfil(prisma, zonaPropia.id);
  await sembrarPlanes(prisma, zonaPropia.id, tiendas, corteActual.id);

  return {
    cortes: todos.length,
    tiendas: tiendas.length,
    registros: ventas.length + ajustes.length + registrosZona.length + registrosCategoria.length,
    meses: `${cortes[0].nombre} — ${corteActual.nombre}`,
  };
}

/** Borra los datos pero no toca la tabla de migraciones: la estructura se queda como está. */
export async function vaciarDatos(prisma: PrismaClient) {
  await prisma.metaPlan.deleteMany();
  await prisma.hitoPlan.deleteMany();
  await prisma.planAccion.deleteMany();
  await prisma.alerta.deleteMany();
  await prisma.analisis.deleteMany();
  await prisma.notaMemoria.deleteMany();
  await prisma.extraccion.deleteMany();
  await prisma.registroCategoria.deleteMany();
  await prisma.registroAjuste.deleteMany();
  await prisma.registroVentas.deleteMany();
  await prisma.registroZona.deleteMany();
  await prisma.corte.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.tienda.deleteMany();
  await prisma.perfil.deleteMany();
  await prisma.zona.deleteMany();
}

const UMBRALES = [
  { clave: "CUMPLIMIENTO_MIN", etiqueta: "Cumplimiento mínimo creíble", valor: 50, unidad: "PORCENTAJE" },
  { clave: "CUMPLIMIENTO_MAX", etiqueta: "Cumplimiento máximo creíble", valor: 150, unidad: "PORCENTAJE" },
  { clave: "AJUSTE_MAX_PCT", etiqueta: "Ajuste máximo sobre ventas", valor: 1.2, unidad: "PORCENTAJE" },
  { clave: "AJUSTE_MIN_PCT", etiqueta: "Ajuste mínimo para tomarlo en cuenta", valor: 0.1, unidad: "PORCENTAJE" },
  { clave: "FACTOR_ATIPICO", etiqueta: "Factor de desviación para marcar un valor atípico", valor: 3, unidad: "FACTOR" },
  { clave: "SALTO_MAX_PCT", etiqueta: "Salto máximo entre cortes", valor: 40, unidad: "PORCENTAJE" },
  { clave: "TOLERANCIA_SUBTOTAL", etiqueta: "Tolerancia al comparar subtotales", valor: 1, unidad: "PORCENTAJE" },
  { clave: "MARGEN_MIN_PCT", etiqueta: "Margen bruto mínimo aceptable", valor: 16, unidad: "PORCENTAJE" },
];

async function sembrarUmbrales(prisma: PrismaClient) {
  await prisma.umbral.deleteMany();
  await prisma.umbral.createMany({ data: UMBRALES });
}

/** Referencias de supermercado de alimentos, del orden de las que publican NRF e IGD. */
const BENCHMARKS = [
  { clave: "MB_PCT", etiqueta: "Margen bruto", valor: 22.0, unidad: "PORCENTAJE", fuente: "NRF/IGD" },
  { clave: "UPT", etiqueta: "Unidades por transacción", valor: 2.6, unidad: "FACTOR", fuente: "NRF/IGD" },
  { clave: "RPT", etiqueta: "Ticket promedio (RPT)", valor: 29.0, unidad: "USD", fuente: "NRF/IGD" },
  { clave: "ASP", etiqueta: "Precio medio por unidad (ASP)", valor: 11.2, unidad: "USD", fuente: "NRF/IGD" },
  { clave: "MERMA_PCT", etiqueta: "Merma sobre ventas", valor: 1.0, unidad: "PORCENTAJE", fuente: "NRF/IGD" },
  { clave: "AJUSTES_PCT", etiqueta: "Ajustes totales sobre ventas", valor: 1.5, unidad: "PORCENTAJE", fuente: "Interno" },
];

async function sembrarBenchmarks(prisma: PrismaClient) {
  await prisma.benchmark.deleteMany();
  await prisma.benchmark.createMany({
    data: BENCHMARKS.map((b) => ({ ...b, nota: "Valor de demostración." })),
  });
}

async function sembrarPerfil(prisma: PrismaClient, zonaPropiaId: string) {
  await prisma.perfil.create({
    data: {
      id: "maestro",
      nombre: "José García",
      cargo: "Director de Operaciones",
      marca: "JG Operaciones",
      iniciales: "JG",
      zonaPropiaId,
      contexto:
        "Gestiono las 6 tiendas de la Zona Metropolitana de Supermercados Vega y las comparo " +
        "contra el resto de la cadena. Mantengo el Tablero de Control de Ventas y el Reporte " +
        "de Ajustes por Tipología corte a corte, detecto inconsistencias en la data fuente y " +
        "convierto los números en presentaciones de tienda, informes ejecutivos y planes de acción.",
      instruccionesCerebro:
        "Analiza con criterio de director de operaciones retail: crítico, preciso y orientado a " +
        "ejecución en tienda. Usa benchmarks internacionales de supermercado (NRF/IGD), prioriza " +
        "por $ de oportunidad, separa causa raíz de síntoma y di explícitamente qué no se puede " +
        "concluir con los datos disponibles.",
    },
  });
}

async function sembrarPlanes(
  prisma: PrismaClient,
  zonaId: string,
  tiendas: { perfil: (typeof TIENDAS)[number]; fila: { id: string } }[],
  corteId: string,
) {
  const sanMarcos = tiendas.find((t) => t.perfil.codigo === "SMA")!;
  const puertoNuevo = tiendas.find((t) => t.perfil.codigo === "PNU")!;

  await prisma.planAccion.create({
    data: {
      titulo: "Recuperar margen en Vega San Marcos",
      alcance: "TIENDA",
      tiendaId: sanMarcos.fila.id,
      corteId,
      estado: "ACTIVO",
      oportunidadUsd: 96_400,
      diagnostico:
        "San Marcos cierra con 16,9 % de margen bruto contra 22,0 % de referencia y 20,7 % de " +
        "la zona. La merma va en 1,84 % de ventas, casi el doble de la mediana de la zona, y el " +
        "ajuste de inventario es el más alto de las seis tiendas. El ticket promedio de $22,6 es " +
        "el más bajo, pero el problema no es de venta sino de lo que se pierde antes de venderla.",
      metas: {
        create: [
          { indicador: "Margen bruto", valorActual: 16.9, valorObjetivo: 19.5, unidad: "PORCENTAJE" },
          { indicador: "Merma sobre ventas", valorActual: 1.84, valorObjetivo: 1.15, unidad: "PORCENTAJE" },
          { indicador: "Oportunidad recuperable", valorActual: 0, valorObjetivo: 96_400, unidad: "USD" },
        ],
      },
      hitos: {
        create: [
          { mes: 1, descripcion: "Inventario ciclíco diario en carnicería y charcutería; cuadre firmado por turno.", responsable: "Gerente de tienda", estado: "EN_CURSO" },
          { mes: 1, descripcion: "Revisar mermas de frutas y verduras contra pedido: ajustar pedido a rotación real.", responsable: "Jefe de perecederos", estado: "EN_CURSO" },
          { mes: 2, descripcion: "Capacitación de recepción y control de temperatura en cadena de frío.", responsable: "Jefe de almacén", estado: "PENDIENTE" },
          { mes: 3, descripcion: "Auditoría de precios y cuadre de inventario general.", responsable: "Contraloría", estado: "PENDIENTE" },
        ],
      },
    },
  });

  await prisma.planAccion.create({
    data: {
      titulo: "Acelerar la rampa de Vega Puerto Nuevo",
      alcance: "TIENDA",
      tiendaId: puertoNuevo.fila.id,
      corteId,
      estado: "ACTIVO",
      oportunidadUsd: 148_000,
      diagnostico:
        "Con cinco meses abierta, Puerto Nuevo va al 96 % de su meta y todavía por debajo del " +
        "potencial de su plaza. El ticket de $26,9 está en línea con la zona, así que el problema " +
        "es de tráfico, no de conversión: falta que la plaza la conozca.",
      metas: {
        create: [
          { indicador: "Transacciones", valorActual: 41_600, valorObjetivo: 52_000, unidad: "UNIDADES" },
          { indicador: "Logro contra meta", valorActual: 96, valorObjetivo: 102, unidad: "PORCENTAJE" },
        ],
      },
      hitos: {
        create: [
          { mes: 1, descripcion: "Campaña de apertura en radio local y volanteo en tres urbanizaciones vecinas.", responsable: "Mercadeo", estado: "EN_CURSO" },
          { mes: 2, descripcion: "Ampliar horario a domingos y feriados durante la temporada alta.", responsable: "Gerente de tienda", estado: "PENDIENTE" },
          { mes: 3, descripcion: "Medir recurrencia de clientes y ajustar surtido a la canasta de la zona.", responsable: "Categorías", estado: "PENDIENTE" },
        ],
      },
    },
  });

  await prisma.planAccion.create({
    data: {
      titulo: "Bajar el ajuste de carga y descarga en la zona",
      alcance: "ZONA",
      zonaId,
      corteId,
      estado: "BORRADOR",
      oportunidadUsd: 54_200,
      diagnostico:
        "Carga y descarga pesa 0,26 % de la venta de la zona, por encima de lo razonable para " +
        "el volumen que se maneja. Es la tipología más dependiente de proceso —quién recibe, " +
        "con qué conteo, contra qué documento— y por eso la más corregible.",
      metas: {
        create: [
          { indicador: "Carga y descarga sobre ventas", valorActual: 0.26, valorObjetivo: 0.16, unidad: "PORCENTAJE" },
        ],
      },
      hitos: {
        create: [
          { mes: 1, descripcion: "Estandarizar el protocolo de recepción en las seis tiendas.", responsable: "Operaciones", estado: "PENDIENTE" },
          { mes: 2, descripcion: "Doble conteo obligatorio en proveedores con más diferencia histórica.", responsable: "Jefes de almacén", estado: "PENDIENTE" },
        ],
      },
    },
  });
}
