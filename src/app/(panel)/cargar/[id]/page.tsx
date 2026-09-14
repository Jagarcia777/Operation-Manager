import Link from "next/link";
import { notFound } from "next/navigation";
import { EstadoVacio } from "@/components/EstadoVacio";
import { cargarTiendas } from "@/lib/consultas";
import { prisma } from "@/lib/db";
import { emparejarTienda } from "@/lib/extraccion/emparejar";
import type { ExtraccionResumenEjecutivoTipo } from "@/lib/extraccion/esquemas";
import { RevisarResumen } from "./RevisarResumen";
import { moneda } from "@/lib/formato";
import { confirmarExtraccion } from "../acciones";

const CAMPOS_VENTAS = [
  { clave: "ventasMeta", titulo: "Ventas meta" },
  { clave: "ventasReal", titulo: "Ventas real" },
  { clave: "unidadesMeta", titulo: "Unid. meta" },
  { clave: "unidadesReal", titulo: "Unid. real" },
  { clave: "transaccionesMeta", titulo: "Transac. meta" },
  { clave: "transaccionesReal", titulo: "Transac. real" },
  { clave: "margenBrutoMeta", titulo: "%MB meta" },
  { clave: "margenBrutoReal", titulo: "%MB real" },
] as const;

const CAMPOS_AJUSTES = [
  { clave: "merma", titulo: "Merma" },
  { clave: "mercanciaDanada", titulo: "Mercancía Dañada" },
  { clave: "cargaYDescarga", titulo: "Carga y Descarga" },
  { clave: "inventario", titulo: "Inventario" },
  { clave: "ventas", titulo: "Ventas" },
] as const;

type LecturaVentas = {
  periodo?: string | null;
  filas: Record<string, unknown>[];
  subtotalesDeclarados?: { etiqueta: string; ventas: number | null }[];
  observaciones?: string[];
  unidad?: string;
};

export default async function RevisarExtraccionPage({ params }: PageProps<"/cargar/[id]">) {
  const { id } = await params;
  const extraccion = await prisma.extraccion.findUnique({
    where: { id },
    include: { corte: true },
  });
  if (!extraccion) notFound();

  if (extraccion.estado === "ERROR") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl">No se pudo leer el documento</h1>
        <div className="tarjeta bg-alerta-tenue px-4 py-3 text-sm text-alerta">
          {extraccion.error ?? "Error desconocido."}
        </div>
        <Link href="/cargar" className="boton boton-secundario">
          Volver a Cargar datos
        </Link>
      </div>
    );
  }

  if (!extraccion.respuestaCruda) {
    return <EstadoVacio mensaje="El documento sigue en proceso. Vuelve a intentarlo en un momento." />;
  }

  const tiendas = await cargarTiendas();
  const catalogo = tiendas.map((tienda) => ({
    id: tienda.id,
    nombre: tienda.nombre,
    codigo: tienda.codigo,
    alias: tienda.alias,
  }));

  if (extraccion.destino === "RESUMEN") {
    const resumen = JSON.parse(extraccion.respuestaCruda) as ExtraccionResumenEjecutivoTipo;
    const categorias = await prisma.categoria.findMany({
      select: { nombre: true, alias: true },
      orderBy: { orden: "asc" },
    });

    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl">Revisar el Resumen Ejecutivo</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            {extraccion.archivoNombre}. Antes de guardar, comprueba que cada bloque cuadre con el
            total que el propio informe imprime: es lo que detecta una fila saltada, que es como
            falla de verdad la lectura de una tabla larga.
          </p>
        </header>

        <RevisarResumen lectura={resumen} catalogo={catalogo} categorias={categorias} />

        <form action={confirmarExtraccion} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="extraccionId" value={extraccion.id} />
          <button type="submit" className="boton boton-primario">
            Guardar el informe
          </button>
          <Link href="/cargar" className="boton boton-secundario">
            Descartar
          </Link>
        </form>
      </div>
    );
  }

  const lectura = JSON.parse(extraccion.respuestaCruda) as LecturaVentas;

  const esAjustes = extraccion.destino === "AJUSTES";
  const campos = esAjustes ? CAMPOS_AJUSTES : CAMPOS_VENTAS;

  const filas = lectura.filas.map((fila) => ({
    valores: fila,
    emparejamiento: emparejarTienda(String(fila.tienda ?? ""), catalogo),
  }));
  const sinEmparejar = filas.filter((fila) => !fila.emparejamiento.tiendaId).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Revisar lectura</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          {extraccion.archivoNombre} · {extraccion.corte?.nombre}. Confirma o corrige antes de
          guardar: lo que el modelo no pudo leer viene en blanco, y así se queda si no lo llenas.
        </p>
      </header>

      {(lectura.observaciones?.length ?? 0) > 0 && (
        <section className="tarjeta bg-atencion-tenue px-4 py-3">
          <h2 className="text-sm font-semibold text-atencion">Lo que conviene confirmar</h2>
          <ul className="mt-1.5 space-y-1 text-sm text-atencion">
            {lectura.observaciones?.map((observacion, indice) => (
              <li key={indice}>· {observacion}</li>
            ))}
          </ul>
        </section>
      )}

      {sinEmparejar > 0 && (
        <div className="tarjeta bg-alerta-tenue px-4 py-3 text-sm text-alerta">
          {sinEmparejar} fila(s) no se pudieron asociar a una tienda del catálogo. Asígnalas o
          quedarán fuera al guardar.
        </div>
      )}

      <form action={confirmarExtraccion} className="space-y-4">
        <input type="hidden" name="extraccionId" value={extraccion.id} />
        <input type="hidden" name="filas" value={filas.length} />
        {esAjustes && <input type="hidden" name="unidad" value={lectura.unidad ?? "MONTO"} />}

        <div className="tarjeta overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th className="text-left">Leído en el documento</th>
                <th className="text-left">Tienda</th>
                {campos.map((campo) => (
                  <th key={campo.clave} className="text-right">
                    {campo.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, indice) => (
                <tr key={indice}>
                  <td className="text-texto-2">{String(fila.valores.tienda ?? "—")}</td>
                  <td>
                    <select
                      name={`fila.${indice}.tiendaId`}
                      defaultValue={fila.emparejamiento.tiendaId ?? ""}
                      className={`campo w-44 ${
                        fila.emparejamiento.tiendaId ? "" : "border-alerta"
                      }`}
                    >
                      <option value="">Sin asignar</option>
                      {catalogo.map((tienda) => (
                        <option key={tienda.id} value={tienda.id}>
                          {tienda.nombre}
                        </option>
                      ))}
                    </select>
                  </td>
                  {campos.map((campo) => (
                    <td key={campo.clave}>
                      <input
                        type="number"
                        step="any"
                        name={`fila.${indice}.${campo.clave}`}
                        defaultValue={
                          typeof fila.valores[campo.clave] === "number"
                            ? String(fila.valores[campo.clave])
                            : ""
                        }
                        className="campo w-28 text-right"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(lectura.subtotalesDeclarados?.length ?? 0) > 0 && (
          <section className="tarjeta p-4">
            <h2 className="text-sm font-semibold">Subtotales impresos en el documento</h2>
            <p className="mt-1 text-xs text-texto-3">
              Al guardar se comparan contra la suma real de las tiendas. Si no cuadran, se levanta
              una alerta en vez de corregirlos.
            </p>
            <ul className="mt-2 space-y-1 text-sm text-texto-2">
              {lectura.subtotalesDeclarados?.map((subtotal, indice) => (
                <li key={indice} className="flex justify-between">
                  <span>{subtotal.etiqueta}</span>
                  <span className="cifra">{moneda(subtotal.ventas)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link href="/cargar" className="boton boton-secundario">
            Cancelar
          </Link>
          <button type="submit" className="boton boton-primario">
            Guardar en el corte
          </button>
        </div>
      </form>
    </div>
  );
}
