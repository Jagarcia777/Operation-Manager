import Link from "next/link";
import { prisma } from "@/lib/db";
import { buscarBajoCosto, type LecturaCategoriasTienda } from "@/lib/extraccion/categoriasTienda";
import { emparejarTienda, indiceDeCategorias, normalizar } from "@/lib/extraccion/emparejar";
import { datosDelCorte } from "@/lib/extraccion/guardarCategorias";
import { moneda, numero, porcentaje } from "@/lib/formato";
import { confirmarExtraccion } from "../acciones";

type Tienda = { id: string; nombre: string; codigo: string | null; alias: string | null };

function fechaLegible(iso: string | null) {
  if (!iso) return "—";
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

/**
 * Revisión del reporte de ventas por categoría de una tienda. Las cifras vienen del texto del
 * PDF, tal cual, así que aquí no se corrigen números: se confirma de qué tienda es, se ve en qué
 * corte cae y se mira lo que no cuadra antes de guardarlo.
 */
export async function RevisarCategorias({
  extraccionId,
  archivoNombre,
  lectura,
  catalogo,
  error,
}: {
  extraccionId: string;
  archivoNombre: string;
  lectura: LecturaCategoriasTienda;
  catalogo: Tienda[];
  error: string | null;
}) {
  // La tienda se deduce del nombre que trae el reporte y, si no alcanza, del nombre del archivo.
  const porReporte = lectura.sucursal ? emparejarTienda(lectura.sucursal, catalogo) : null;
  const porArchivo = emparejarTienda(
    archivoNombre.replace(/\.pdf$/i, "").replace(/ventas por categor[ií]as?|\d{6,}/gi, ""),
    catalogo,
  );
  const tiendaId = porReporte?.tiendaId ?? porArchivo.tiendaId ?? "";

  const corteDestino =
    lectura.desde && lectura.hasta ? datosDelCorte(lectura.desde, lectura.hasta) : null;

  const [categoriasCatalogo, corte] = await Promise.all([
    prisma.categoria.findMany({ select: { nombre: true, alias: true } }),
    corteDestino
      ? prisma.corte.findUnique({ where: { nombre: corteDestino.nombre } })
      : Promise.resolve(null),
  ]);
  const porNombre = indiceDeCategorias(categoriasCatalogo);

  // Lo que ya tiene cargado el corte para esa tienda, normalmente del Resumen Ejecutivo.
  const cargado =
    corte && tiendaId
      ? await prisma.registroVentas.findUnique({
          where: { corteId_tiendaId: { corteId: corte.id, tiendaId } },
        })
      : null;

  const total = lectura.total.ventas;
  const sinCatalogo = lectura.categorias.filter(
    (fila) => !porNombre.has(normalizar(fila.categoria)),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Revisar ventas por categoría</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          {archivoNombre}. Leído directo del texto del PDF, sin IA: las cifras son las impresas.
          Confirma la tienda y revisa lo que no cuadra antes de guardar.
        </p>
      </header>

      {error === "tienda" && (
        <p className="tarjeta bg-alerta-tenue px-4 py-3 text-sm text-alerta">
          Elige de qué tienda es el reporte antes de guardarlo.
        </p>
      )}

      <form action={confirmarExtraccion} className="space-y-6">
        <input type="hidden" name="extraccionId" value={extraccionId} />

        <section className="tarjeta grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="text-texto-2">Tienda</span>
            <select
              name="tiendaId"
              defaultValue={tiendaId}
              required
              className={`campo mt-1.5 ${tiendaId ? "" : "border-alerta"}`}
            >
              <option value="">Sin asignar</option>
              {catalogo.map((tienda) => (
                <option key={tienda.id} value={tienda.id}>
                  {tienda.nombre}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-texto-3">
              En el reporte: {lectura.sucursal ?? "sin nombre"}
            </span>
          </label>
          <div className="text-sm">
            <p className="text-texto-2">Período</p>
            <p className="mt-1.5 font-medium tabular-nums">
              {fechaLegible(lectura.desde)} al {fechaLegible(lectura.hasta)}
            </p>
            <p className="mt-1 text-xs text-texto-3">
              Se guarda en {corteDestino?.nombre ?? "—"}
              {corte ? "" : " (corte nuevo)"}
            </p>
          </div>
          <div className="text-sm">
            <p className="text-texto-2">Venta del período</p>
            <p className="mt-1.5 font-medium tabular-nums">{moneda(total)}</p>
            <p className="mt-1 text-xs text-texto-3">
              {numero(lectura.total.unidades)} unidades
            </p>
          </div>
          <div className="text-sm">
            <p className="text-texto-2">Margen acumulado</p>
            <p className="mt-1.5 font-medium tabular-nums">{porcentaje(lectura.total.margen, 2)}</p>
            <p className="mt-1 text-xs text-texto-3">
              El Resumen Ejecutivo no lo publica por tienda
            </p>
          </div>
        </section>

        {cargado?.ventasReal && total ? (
          <p
            className={`tarjeta px-4 py-3 text-sm ${
              Math.abs(total - cargado.ventasReal) / cargado.ventasReal <= 0.005
                ? "bg-exito-tenue text-exito"
                : "bg-alerta-tenue text-alerta"
            }`}
          >
            {Math.abs(total - cargado.ventasReal) / cargado.ventasReal <= 0.005
              ? `Coincide con lo cargado en el corte: ${moneda(cargado.ventasReal)}.`
              : `No coincide con lo cargado en el corte (${moneda(cargado.ventasReal)}): al guardar se levanta una alerta.`}
          </p>
        ) : null}

        {(lectura.observaciones.length > 0 || sinCatalogo.length > 0) && (
          <section className="tarjeta bg-atencion-tenue px-4 py-3">
            <h2 className="text-sm font-semibold text-atencion">Lo que conviene confirmar</h2>
            <ul className="mt-1.5 space-y-1 text-sm text-atencion">
              {lectura.observaciones.map((observacion, indice) => (
                <li key={indice}>· {observacion}</li>
              ))}
              {sinCatalogo.length > 0 && (
                <li>
                  · {sinCatalogo.map((fila) => fila.categoria).join(", ")} no está en el catálogo
                  de categorías: queda fuera de la mezcla y se levanta una alerta.
                </li>
              )}
            </ul>
          </section>
        )}

        <section className="tarjeta overflow-x-auto">
          <table className="tabla min-w-[760px]">
            <thead>
              <tr>
                <th className="text-left">Categoría</th>
                <th>Venta</th>
                <th>% impreso</th>
                <th>% de la venta</th>
                <th>Unidades</th>
                <th>Margen</th>
              </tr>
            </thead>
            <tbody>
              {lectura.categorias.map((fila) => {
                const derivado = fila.ventas !== null && total ? (fila.ventas / total) * 100 : null;
                const difiere =
                  derivado !== null &&
                  fila.porcentajeImpreso !== null &&
                  Math.abs(derivado - fila.porcentajeImpreso) > 0.1;
                const enCatalogo = porNombre.has(normalizar(fila.categoria));
                return (
                  <tr key={fila.categoria}>
                    <td className="text-left">
                      {fila.categoria}
                      {!enCatalogo && (
                        <span className="ml-2 text-xs text-alerta">sin catálogo</span>
                      )}
                    </td>
                    <td>{moneda(fila.ventas)}</td>
                    <td className={difiere ? "text-atencion" : "text-texto-3"}>
                      {porcentaje(fila.porcentajeImpreso, 2)}
                    </td>
                    <td>{porcentaje(derivado, 2)}</td>
                    <td>{numero(fila.unidades)}</td>
                    <td>{porcentaje(fila.margen, 2)}</td>
                  </tr>
                );
              })}
              <tr className="font-semibold">
                <td className="text-left">Total</td>
                <td>{moneda(total)}</td>
                <td />
                <td>{porcentaje(100, 2)}</td>
                <td>{numero(lectura.total.unidades)}</td>
                <td>{porcentaje(lectura.total.margen, 2)}</td>
              </tr>
            </tbody>
          </table>
        </section>
        <p className="-mt-3 text-xs text-texto-3">
          El «% impreso» no siempre es la venta de la categoría entre el total; la aplicación usa
          la columna de al lado, que sí lo es. Donde difieren se marca en ámbar.
        </p>

        {(lectura.topProductos?.length ?? 0) > 0 && (
          <section className="tarjeta p-4">
            <h2 className="text-sm font-semibold">Lo que más vende la tienda</h2>
            <ol className="mt-2 grid gap-x-6 gap-y-1 text-sm text-texto-2 sm:grid-cols-2">
              {lectura.topProductos!.map((producto) => {
                const bajoCosto = Boolean(buscarBajoCosto(producto.producto, lectura.bajoCosto));
                return (
                  <li key={producto.posicion} className="flex justify-between gap-3">
                    <span>
                      <span className="mr-2 text-texto-3 tabular-nums">{producto.posicion}</span>
                      {producto.producto}
                      {bajoCosto && (
                        <span className="chip ml-2 bg-alerta-tenue text-alerta">bajo costo</span>
                      )}
                    </span>
                    <span className="text-xs text-texto-3 tabular-nums">
                      {producto.ventasAprox ? `~${moneda(producto.ventasAprox)}` : "—"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {lectura.bajoCosto.length > 0 && (
          <section className="tarjeta p-4">
            <h2 className="text-sm font-semibold">
              Vendidos a costo o por debajo · {lectura.bajoCosto.length}
            </h2>
            <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm text-texto-2 sm:grid-cols-2">
              {lectura.bajoCosto.map((producto) => (
                <li key={producto.codigo} className="flex justify-between gap-3">
                  <span>{producto.producto}</span>
                  <span className="text-xs text-texto-3 tabular-nums">{producto.codigo}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link href="/cargar" className="boton boton-secundario">
            Descartar
          </Link>
          <button type="submit" className="boton boton-primario">
            Guardar en {corteDestino?.nombre ?? "el corte"}
          </button>
        </div>
      </form>
    </div>
  );
}
