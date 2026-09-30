import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  TIENDAS_RESTO,
  completarCatalogo,
  sembrarCatalogo,
} from "../src/lib/catalogo";
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
    await completarCatalogo(prisma);
    return;
  }

  const { tiendas, categorias } = await sembrarCatalogo(prisma);

  // Los cortes de ejemplo son relleno para que las pantallas no se vean vacías la primera
  // vez; el catálogo es lo que la aplicación necesita de verdad.
  if (!SOLO_CATALOGO) {
    await sembrarCortesDeEjemplo(tiendas, categorias);
  }

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

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
