import Link from "next/link";
import { EstadoVacio } from "@/components/EstadoVacio";
import { SelectorCorte } from "@/components/SelectorCorte";
import { TarjetaKpi } from "@/components/TarjetaKpi";
import { GraficoPareto } from "@/components/graficos/GraficoPareto";
import { analizarCategorias, consolidarCategorias } from "@/lib/categorias";
import { cargarProductos, cargarTiendas, listarCortes, resolverCorte } from "@/lib/consultas";
import { prisma } from "@/lib/db";
import { ETIQUETA_BCG, ETIQUETA_PARETO, type ClaseBcg, type ZonaPareto } from "@/lib/dominio";
import {
  agruparBajoCosto,
  esProblemaDeCadena,
  mismoProducto,
  type ProductoEnTiendas,
} from "@/lib/extraccion/categoriasTienda";
import { moneda, numero, porcentaje } from "@/lib/formato";

const TONO_BCG: Record<ClaseBcg, string> = {
  ESTRELLA: "bg-exito-tenue text-exito",
  VACA_LECHERA: "bg-acento-tenue text-acento",
  INTERROGANTE: "bg-atencion-tenue text-atencion",
  PERRO: "bg-alerta-tenue text-alerta",
};

export default async function CategoriasPage({ searchParams }: PageProps<"/categorias">) {
  const parametros = await searchParams;
  const corteId = typeof parametros.corte === "string" ? parametros.corte : undefined;
  const tiendaId = typeof parametros.tienda === "string" ? parametros.tienda : "";

  const [cortes, corte, tiendas] = await Promise.all([
    listarCortes(),
    resolverCorte(corteId),
    cargarTiendas(),
  ]);
  if (!corte) return <EstadoVacio mensaje="No hay cortes cargados todavía." />;

  const [encontrados, bajoCosto, topTiendas] = await Promise.all([
    prisma.registroCategoria.findMany({
      where: { corteId: corte.id, ...(tiendaId ? { tiendaId } : {}) },
      include: { categoria: true },
    }),
    prisma.productoBajoCosto.findMany({
      where: { corteId: corte.id, ...(tiendaId ? { tiendaId } : {}) },
      include: { tienda: { select: { nombre: true } } },
    }),
    prisma.topProductoTienda.findMany({
      where: { corteId: corte.id, ...(tiendaId ? { tiendaId } : {}) },
      include: { tienda: { select: { nombre: true } } },
      orderBy: { posicion: "asc" },
    }),
  ]);
  // Si el corte tiene el reporte por categoría de las tiendas, la vista de conjunto es la suma
  // de esas tiendas. La mezcla consolidada de la cadena solo se usa cuando no hay otra: sumar
  // las dos contaría dos veces la venta de la zona.
  const deTiendas = encontrados.filter((registro) => registro.tiendaId !== null);
  const registros = !tiendaId && deTiendas.length ? deTiendas : encontrados;
  const tiendasConReporte = new Set(deTiendas.map((registro) => registro.tiendaId)).size;

  if (registros.length === 0) {
    return (
      <div className="space-y-6">
        <Encabezado corte={corte} cortes={cortes} tiendas={tiendas} tiendaId={tiendaId} />
        <EstadoVacio mensaje="Este corte no tiene detalle por categoría cargado todavía." />
      </div>
    );
  }

  const analisis = analizarCategorias(consolidarCategorias(registros));
  // El top de productos es de toda la cadena y del día, así que solo tiene sentido cuando no
  // se está mirando una tienda suelta: enseñarlo filtrado diría que esos son los productos de
  // esa tienda, y no lo son.
  const productos = tiendaId ? { perecederos: [], noPerecederos: [] } : await cargarProductos(corte.id);
  const tiendaActual = tiendas.find((tienda) => tienda.id === tiendaId);
  const ambito = nombreDelAmbito(tiendas);
  // El Resumen Ejecutivo publica la mezcla por categoría consolidada de toda la cadena, sin
  // abrirla por sucursal: esas filas llegan sin tienda. Rotularlas con el nombre de la zona
  // diría que esa venta es de las seis tiendas, y es de las veinticinco.
  const esDeLaCadena = registros.some((registro) => registro.tiendaId === null);
  const alcance = tiendaActual ? tiendaActual.nombre : esDeLaCadena ? "Toda la cadena" : ambito;

  const porClase = (clase: ClaseBcg) =>
    analisis.filas.filter((fila) => fila.claseBcg === clase).length;

  return (
    <div className="space-y-6">
      <Encabezado
        corte={corte}
        cortes={cortes}
        tiendas={esDeLaCadena ? [] : tiendas}
        tiendaId={tiendaId}
        alcance={alcance}
      />

      {esDeLaCadena && (
        <p className="text-xs text-texto-3">
          Esta mezcla viene del Resumen Ejecutivo, que la publica consolidada para toda la
          cadena y no abierta por sucursal. Para verla por tienda, sube en Cargar datos el
          reporte de ventas por categoría de cada una.
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi
          etiqueta="Venta analizada"
          valor={moneda(analisis.ventaTotal)}
          detalle={alcance}
        />
        <TarjetaKpi
          etiqueta="Margen de la mezcla"
          valor={porcentaje(analisis.margenTotalPct)}
          detalle={moneda(analisis.margenTotalUsd)}
        />
        <TarjetaKpi
          etiqueta="Categorías vitales"
          valor={`${analisis.categoriasVitales} de ${analisis.filas.length}`}
          detalle="Concentran el 80% de la venta"
        />
        <TarjetaKpi
          etiqueta="Margen mediano"
          valor={porcentaje(analisis.medianaMargen)}
          detalle="Frontera para clasificar el margen"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(["ESTRELLA", "VACA_LECHERA", "INTERROGANTE", "PERRO"] as ClaseBcg[]).map((clase) => (
          <div key={clase} className="tarjeta px-4 py-3">
            <span className={`chip ${TONO_BCG[clase]}`}>{ETIQUETA_BCG[clase]}</span>
            <p className="mt-2 text-lg font-semibold tabular-nums">{porClase(clase)}</p>
            <p className="text-xs text-texto-3">
              {clase === "ESTRELLA" && "Peso alto y margen alto: sostener e invertir"}
              {clase === "VACA_LECHERA" && "Peso alto con margen bajo: cuidar el costo"}
              {clase === "INTERROGANTE" && "Margen alto sin volumen: espacio para crecer"}
              {clase === "PERRO" && "Poco peso y poco margen: revisar surtido"}
            </p>
          </div>
        ))}
      </section>

      <section className="tarjeta p-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Dónde está la venta · {alcance}</h2>
          <span className="text-xs text-texto-3">
            La línea marca el 80 % acumulado: a su izquierda, lo vital
          </span>
        </div>
        <GraficoPareto
          barras={analisis.filas.map((fila) => ({
            etiqueta: fila.categoria,
            valor: fila.ventasReal ?? 0,
            acumulado: fila.acumulado ?? 0,
            vital: fila.zonaPareto === "VITAL",
          }))}
        />
      </section>

      <div className="tarjeta overflow-x-auto">
        <table className="tabla">
          <thead>
            <tr>
              <th className="text-left">#</th>
              <th className="text-left">Categoría</th>
              <th className="text-right">Venta</th>
              <th className="text-right">Peso</th>
              <th className="text-right">Acumulado</th>
              <th className="text-right">%MB</th>
              <th className="text-right">Margen $</th>
              <th className="text-left">Pareto</th>
              <th className="text-left">BCG</th>
            </tr>
          </thead>
          <tbody>
            {analisis.filas.map((fila, indice) => (
              <tr key={fila.categoriaId} className="transition-colors hover:bg-superficie-2">
                <td className="text-texto-3">{indice + 1}</td>
                <td className="font-medium">{fila.categoria}</td>
                <td className="cifra">{moneda(fila.ventasReal)}</td>
                <td className="cifra">{porcentaje(fila.pesoVenta)}</td>
                <td className="cifra text-texto-3">{porcentaje(fila.acumulado)}</td>
                <td className="cifra">{porcentaje(fila.margenBrutoReal)}</td>
                <td className="cifra">{moneda(fila.margenUsd)}</td>
                <td className="text-texto-2">{ETIQUETA_PARETO[fila.zonaPareto as ZonaPareto]}</td>
                <td>
                  <span className={`chip ${TONO_BCG[fila.claseBcg]}`}>
                    {ETIQUETA_BCG[fila.claseBcg]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-texto-3">
        Criterio de clasificación: una categoría tiene peso alto si entra en el 80% acumulado de la
        venta, y margen alto si supera el margen mediano del conjunto ({porcentaje(analisis.medianaMargen)}).
        Ambos umbrales se calculan sobre las categorías de este mismo corte, no contra una tabla fija.
      </p>

      <TopDeTiendas
        filas={topTiendas.map((fila) => ({
          posicion: fila.posicion,
          producto: fila.producto,
          ventasAprox: fila.ventasAprox,
          tienda: fila.tienda.nombre,
          bajoCosto: bajoCosto.some(
            (registro) =>
              registro.tiendaId === fila.tiendaId && mismoProducto(fila.producto, registro.producto),
          ),
        }))}
        deUnaTienda={Boolean(tiendaId)}
      />

      <BajoCosto
        grupos={agruparBajoCosto(
          bajoCosto.map((registro) => ({
            codigo: registro.codigo,
            producto: registro.producto,
            tienda: registro.tienda.nombre,
          })),
        )}
        tiendasCargadas={tiendaId ? 1 : tiendasConReporte}
        deUnaTienda={Boolean(tiendaId)}
      />

      {(productos.perecederos.length > 0 || productos.noPerecederos.length > 0) && (
        <section className="grid gap-4 lg:grid-cols-2">
          <TopProductos titulo="Perecederos" filas={productos.perecederos} />
          <TopProductos titulo="No perecederos" filas={productos.noPerecederos} />
        </section>
      )}
    </div>
  );
}

type FilaTop = {
  posicion: number;
  producto: string;
  ventasAprox: number | null;
  tienda: string;
  bajoCosto: boolean;
};

/**
 * Qué sostiene la venta. En una tienda, su top en orden; en la zona, los productos que se
 * repiten en el top de varias tiendas, que son los que no pueden faltar en ninguna. Un producto
 * del top que se vende bajo costo va marcado: es la pérdida que más se repite.
 */
function TopDeTiendas({ filas, deUnaTienda }: { filas: FilaTop[]; deUnaTienda: boolean }) {
  if (!filas.length) return null;

  if (deUnaTienda) {
    return (
      <section className="tarjeta overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold tracking-[-0.02em]">Lo que más vende</h2>
          <p className="mt-1 text-sm text-texto-3">
            Venta aproximada: el reporte la grafica redondeada a miles.
          </p>
        </div>
        <table className="tabla">
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.posicion}>
                <td className="w-8 text-left text-texto-3 tabular-nums">{fila.posicion}</td>
                <td className="text-left">
                  {fila.producto}
                  {fila.bajoCosto && (
                    <span className="chip ml-2 bg-alerta-tenue text-alerta">Bajo costo</span>
                  )}
                </td>
                <td className="font-medium">
                  {fila.ventasAprox ? `~${moneda(fila.ventasAprox)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  }

  const porProducto = new Map<string, { tiendas: string[]; venta: number; bajoCosto: string[] }>();
  for (const fila of filas) {
    const actual = porProducto.get(fila.producto) ?? { tiendas: [], venta: 0, bajoCosto: [] };
    actual.tiendas.push(fila.tienda);
    actual.venta += fila.ventasAprox ?? 0;
    if (fila.bajoCosto) actual.bajoCosto.push(fila.tienda);
    porProducto.set(fila.producto, actual);
  }
  const tiendas = new Set(filas.map((fila) => fila.tienda)).size;
  const repetidos = [...porProducto]
    .filter(([, valores]) => valores.tiendas.length > 1)
    .sort((a, b) => b[1].tiendas.length - a[1].tiendas.length || b[1].venta - a[1].venta);
  if (!repetidos.length) return null;

  return (
    <section className="tarjeta overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-base font-semibold tracking-[-0.02em]">
          Lo que más se vende en la zona
        </h2>
        <p className="mt-1 text-sm text-texto-3">
          Productos que están en el top de más de una de las {tiendas} tiendas con reporte. Venta
          aproximada, sumada de las etiquetas redondeadas del gráfico.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="tabla min-w-[560px]">
          <thead>
            <tr>
              <th className="text-left">Producto</th>
              <th>Tiendas</th>
              <th>Venta aprox.</th>
            </tr>
          </thead>
          <tbody>
            {repetidos.map(([producto, valores]) => (
              <tr key={producto}>
                <td className="text-left">
                  {producto}
                  {valores.bajoCosto.length > 0 && (
                    <span className="chip ml-2 bg-alerta-tenue text-alerta">
                      Bajo costo en {valores.bajoCosto.join(", ")}
                    </span>
                  )}
                </td>
                <td>
                  {valores.tiendas.length} de {tiendas}
                </td>
                <td className="font-medium">~{moneda(valores.venta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Productos que las tiendas vendieron a costo o por debajo en el período. El mismo producto en
 * varias tiendas no se arregla tienda por tienda: es un precio o un costo mal cargado para la
 * cadena, y por eso va primero y marcado.
 */
function BajoCosto({
  grupos,
  tiendasCargadas,
  deUnaTienda,
}: {
  grupos: ProductoEnTiendas[];
  tiendasCargadas: number;
  deUnaTienda: boolean;
}) {
  if (!grupos.length) return null;
  const deCadena = grupos.filter((grupo) => esProblemaDeCadena(grupo.tiendas.length)).length;

  return (
    <section className="tarjeta overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-base font-semibold tracking-[-0.02em]">
          Vendidos a costo o por debajo
        </h2>
        <p className="mt-1 text-sm text-texto-3">
          {deUnaTienda
            ? `${grupos.length} productos en esta tienda.`
            : `${grupos.length} productos en ${tiendasCargadas} tiendas con reporte${
                deCadena ? `; ${deCadena} se repiten en varias y apuntan a un precio de cadena` : ""
              }.`}{" "}
          El PDF solo trae las filas que caben en pantalla, así que la lista puede no estar completa.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="tabla min-w-[640px]">
          <thead>
            <tr>
              <th className="text-left">Producto</th>
              <th className="text-left">Código</th>
              {!deUnaTienda && <th className="text-left">Tiendas</th>}
            </tr>
          </thead>
          <tbody>
            {grupos.map((grupo) => (
              <tr key={grupo.codigo}>
                <td className="text-left font-medium">
                  {grupo.producto}
                  {!deUnaTienda && esProblemaDeCadena(grupo.tiendas.length) && (
                    <span className="chip ml-2 bg-alerta-tenue text-alerta">Precio de cadena</span>
                  )}
                </td>
                <td className="text-left text-texto-3 tabular-nums">{grupo.codigo}</td>
                {!deUnaTienda && (
                  <td className="text-left text-texto-2">
                    {grupo.tiendas.length} · {grupo.tiendas.join(", ")}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Lo que más rota, tal como lo publica el informe. La posición importa tanto como las unidades:
 * que un producto entre o salga del top dice más de lo que pasó en la semana que su cifra suelta.
 */
function TopProductos({
  titulo,
  filas,
}: {
  titulo: string;
  filas: { id: string; unidades: number | null; posicion: number | null; producto: { nombre: string } }[];
}) {
  if (!filas.length) return null;
  return (
    <div className="tarjeta overflow-hidden">
      <div className="flex items-baseline justify-between gap-2 px-5 pt-5 pb-3">
        <h2 className="text-base font-semibold tracking-[-0.02em]">Top {titulo}</h2>
        <span className="text-xs text-texto-3">unidades del día</span>
      </div>
      <table className="tabla">
        <tbody>
          {filas.map((fila, indice) => (
            <tr key={fila.id}>
              <td className="w-8 text-left text-texto-3 tabular-nums">{indice + 1}</td>
              <td className="text-left">{fila.producto.nombre}</td>
              <td className="font-medium">{numero(fila.unidades)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Encabezado({
  corte,
  cortes,
  tiendas,
  tiendaId,
  alcance,
}: {
  corte: { id: string; nombre: string };
  cortes: { id: string; nombre: string }[];
  tiendas: { id: string; nombre: string; zona?: { nombre: string } }[];
  tiendaId: string;
  alcance?: string;
}) {
  const ambito = alcance ?? nombreDelAmbito(tiendas);
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Categorías</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            De dónde sale la venta y de dónde sale el margen. El ranking Pareto separa lo vital del
            complemento; la matriz BCG cruza peso contra margen.
          </p>
        </div>
        <SelectorCorte cortes={cortes} actual={corte.id} />
      </header>

      <nav className="no-imprimir flex flex-wrap gap-1.5" hidden={tiendas.length === 0}>
        <Link
          href={`/categorias?corte=${corte.id}`}
          className={`chip ${!tiendaId ? "bg-acento-tenue text-acento" : "bg-superficie-3 text-texto-2"}`}
        >
          {ambito}
        </Link>
        {tiendas.map((tienda) => (
          <Link
            key={tienda.id}
            href={`/categorias?corte=${corte.id}&tienda=${tienda.id}`}
            className={`chip ${
              tiendaId === tienda.id
                ? "bg-acento-tenue text-acento"
                : "bg-superficie-3 text-texto-2"
            }`}
          >
            {tienda.nombre}
          </Link>
        ))}
      </nav>
    </>
  );
}

/** "Toda Zona Metropolitana", o lo que se llame la zona que se está gestionando. */
function nombreDelAmbito(tiendas: { zona?: { nombre: string } }[]): string {
  const zona = tiendas[0]?.zona?.nombre;
  return zona ? `Toda ${zona}` : "Todas las tiendas";
}
