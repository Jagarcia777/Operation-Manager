import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { TIPOLOGIAS } from "../src/lib/dominio";

try {
  process.loadEnvFile(".env");
} catch {
  // Sin archivo .env se usan las variables del entorno.
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  }),
});

const ZONAS = [
  { nombre: "Zona Milagros Velásquez", gerente: "Milagros Velásquez", orden: 1 },
  { nombre: "Zona Gerardo Gómez", gerente: "Gerardo Gómez", orden: 2 },
  { nombre: "Zona José Peña", gerente: "José Peña", orden: 3 },
  { nombre: "Zona José García", gerente: "José García", orden: 4 },
];

// Catálogo provisional: 24 tiendas, 6 por zona. Los nombres se editan desde
// Administración → Tiendas cuando esté el listado definitivo de la cadena.
const TIENDAS_POR_ZONA = 6;

function nombreTienda(indice: number) {
  return indice === 0 ? "Tipuro" : `Tienda ${String(indice + 1).padStart(2, "0")}`;
}

// Generador determinista: el seed debe producir siempre los mismos números.
function pseudoAleatorio(semilla: number) {
  const x = Math.sin(semilla * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Umbrales del motor de alertas. Editables después desde la app.
const UMBRALES = [
  {
    clave: "CUMPLIMIENTO_MIN",
    etiqueta: "Cumplimiento mínimo antes de sospechar del dato",
    valor: 50,
    unidad: "PORCENTAJE",
    nota: "Por debajo de este cumplimiento se revisa si el dato está mal cargado.",
  },
  {
    clave: "CUMPLIMIENTO_MAX",
    etiqueta: "Cumplimiento máximo antes de sospechar del dato",
    valor: 150,
    unidad: "PORCENTAJE",
    nota: "Por encima de este cumplimiento se revisa un posible Meta/Real intercambiado.",
  },
  {
    clave: "AJUSTE_MAX_PCT",
    etiqueta: "Ajuste máximo aceptable por tipología (% sobre ventas)",
    valor: 1,
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
];

const CORTES = [
  {
    nombre: "Cierre Julio 2026",
    tipo: "CIERRE_MES",
    fechaInicio: new Date("2026-07-01"),
    fechaFin: new Date("2026-07-31"),
    estado: "CERRADO",
    diasDelMes: 31,
    diasTranscurridos: 31,
    factor: 0.96,
  },
  {
    nombre: "Cierre Agosto 2026",
    tipo: "CIERRE_MES",
    fechaInicio: new Date("2026-08-01"),
    fechaFin: new Date("2026-08-31"),
    estado: "REVISION",
    diasDelMes: 31,
    diasTranscurridos: 31,
    factor: 1,
  },
];

async function main() {
  const zonas = [];
  for (const zona of ZONAS) {
    zonas.push(
      await prisma.zona.upsert({
        where: { nombre: zona.nombre },
        update: { gerente: zona.gerente, orden: zona.orden },
        create: zona,
      }),
    );
  }

  const tiendas = [];
  for (let i = 0; i < zonas.length * TIENDAS_POR_ZONA; i++) {
    const zona = zonas[Math.floor(i / TIENDAS_POR_ZONA)];
    const nombre = nombreTienda(i);
    const codigo = `T${String(i + 1).padStart(2, "0")}`;
    tiendas.push(
      await prisma.tienda.upsert({
        where: { nombre },
        update: { zonaId: zona.id, codigo, orden: i + 1 },
        create: { nombre, codigo, zonaId: zona.id, orden: i + 1 },
      }),
    );
  }

  for (const definicion of CORTES) {
    const { factor, ...datos } = definicion;
    const corte = await prisma.corte.upsert({
      where: { nombre: datos.nombre },
      update: datos,
      create: datos,
    });

    for (const [i, tienda] of tiendas.entries()) {
      const base = 180_000 + pseudoAleatorio(i + 1) * 240_000;
      const ventasMeta = Math.round((base * factor) / 100) * 100;
      const cumplimiento = 0.82 + pseudoAleatorio(i + 11) * 0.35;
      const ventasReal = Math.round((ventasMeta * cumplimiento) / 100) * 100;
      const ticket = 26 + pseudoAleatorio(i + 21) * 14;
      const transaccionesReal = Math.round(ventasReal / ticket);
      const unidadesReal = Math.round(transaccionesReal * (1.8 + pseudoAleatorio(i + 31) * 1.1));
      const margenBrutoReal = Number((26 + pseudoAleatorio(i + 41) * 8).toFixed(2));

      await prisma.registroVentas.upsert({
        where: { corteId_tiendaId: { corteId: corte.id, tiendaId: tienda.id } },
        update: {},
        create: {
          corteId: corte.id,
          tiendaId: tienda.id,
          ventasMeta,
          ventasReal,
          unidadesMeta: Math.round(unidadesReal / cumplimiento),
          unidadesReal,
          transaccionesMeta: Math.round(transaccionesReal / cumplimiento),
          transaccionesReal,
          margenBrutoMeta: 30,
          margenBrutoReal,
        },
      });

      for (const [j, tipologia] of TIPOLOGIAS.entries()) {
        // Caso real reportado por el negocio: Carga y Descarga muy por encima del rango
        // típico en Tipuro. Se siembra para que el motor de alertas tenga qué detectar.
        const esAtipico =
          tienda.nombre === "Tipuro" &&
          tipologia === "CARGA_DESCARGA" &&
          corte.nombre === "Cierre Agosto 2026";
        const porcentaje = esAtipico
          ? 2.38
          : Number((0.04 + pseudoAleatorio(i * 7 + j + 51) * 0.42).toFixed(2));

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
    }
  }

  for (const umbral of UMBRALES) {
    await prisma.umbral.upsert({
      where: { clave: umbral.clave },
      update: { etiqueta: umbral.etiqueta, unidad: umbral.unidad, nota: umbral.nota },
      create: umbral,
    });
  }

  // Usuario maestro único de la aplicación.
  const zonaPropia = zonas.find((zona) => zona.gerente === "José García");
  await prisma.perfil.upsert({
    where: { id: "maestro" },
    update: { zonaPropiaId: zonaPropia?.id },
    create: {
      id: "maestro",
      nombre: "José García",
      cargo: "Director de Operaciones",
      zonaPropiaId: zonaPropia?.id,
      contexto:
        "Mantengo el Tablero de Control de Ventas y el Reporte de Ajustes por Tipología corte a " +
        "corte, detecto inconsistencias en la data fuente y convierto los números en " +
        "presentaciones de tienda, informes ejecutivos y planes de acción para gerencia.",
      instruccionesCerebro:
        "Analiza con criterio de director de operaciones retail: crítico, preciso y orientado a " +
        "ejecución en tienda. Prioriza por $ de oportunidad, separa causa raíz de síntoma y di " +
        "explícitamente qué no se puede concluir con los datos disponibles.",
    },
  });

  console.log(
    `Seed listo: ${zonas.length} zonas, ${tiendas.length} tiendas, ${CORTES.length} cortes, ` +
      `${UMBRALES.length} umbrales y el perfil maestro.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
