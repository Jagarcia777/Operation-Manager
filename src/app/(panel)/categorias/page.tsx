import Link from "next/link";
import { EstadoVacio } from "@/components/EstadoVacio";
import { SelectorCorte } from "@/components/SelectorCorte";
import { TarjetaKpi } from "@/components/TarjetaKpi";
import { GraficoPareto } from "@/components/graficos/GraficoPareto";
import { analizarCategorias, consolidarCategorias } from "@/lib/categorias";
import { cargarProductos, cargarTiendas, listarCortes, resolverCorte } from "@/lib/consultas";
import { prisma } from "@/lib/db";
import { ETIQUETA_BCG, ETIQUETA_PARETO, type ClaseBcg, type ZonaPareto } from "@/lib/dominio";
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

  const registros = await prisma.registroCategoria.findMany({
    where: { corteId: corte.id, ...(tiendaId ? { tiendaId } : {}) },
    include: { categoria: true },
  });

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
          cadena y no abierta por sucursal. Para verla por tienda hace falta cargar el detalle
          por categoría de cada una.
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

      {(productos.perecederos.length > 0 || productos.noPerecederos.length > 0) && (
        <section className="grid gap-4 lg:grid-cols-2">
          <TopProductos titulo="Perecederos" filas={productos.perecederos} />
          <TopProductos titulo="No perecederos" filas={productos.noPerecederos} />
        </section>
      )}
    </div>
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
