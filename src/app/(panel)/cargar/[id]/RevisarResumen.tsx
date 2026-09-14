import { emparejarTienda, normalizar } from "@/lib/extraccion/emparejar";
import type { ExtraccionResumenEjecutivoTipo } from "@/lib/extraccion/esquemas";
import { revisarTotalesImpresos } from "@/lib/extraccion/resumen";
import { fechaCorta, moneda, numero, porcentaje } from "@/lib/formato";

type Catalogo = { id: string; nombre: string; codigo: string | null; alias: string | null }[];
type Categorias = { nombre: string; alias: string | null }[];

/**
 * Revisión del Resumen Ejecutivo. No se revisa celda por celda: son veinticinco sucursales con
 * dos bloques cada una, veintinueve categorías, cuarenta productos y quince días, y leer
 * trescientas cifras contra el PDF no encuentra el error que de verdad pasa, que es una fila
 * saltada. Lo que se enseña es el cuadre: cada bloque contra el total que el propio informe
 * imprime, y el nombre de todo lo que no se reconoció. Si los tres totales cuadran y no hay
 * nada sin emparejar, la lectura está bien.
 */
export function RevisarResumen({
  lectura,
  catalogo,
  categorias,
}: {
  lectura: ExtraccionResumenEjecutivoTipo;
  catalogo: Catalogo;
  categorias: Categorias;
}) {
  const filas = lectura.sucursales.map((fila) => ({
    fila,
    emparejamiento: emparejarTienda(fila.sucursal, catalogo),
  }));
  const sinEmparejar = filas.filter((entrada) => !entrada.emparejamiento.tiendaId);

  const nombresCategoria = new Set<string>();
  for (const categoria of categorias) {
    nombresCategoria.add(normalizar(categoria.nombre));
    for (const alias of (categoria.alias ?? "").split(/[\n,;]/)) {
      if (alias.trim()) nombresCategoria.add(normalizar(alias));
    }
  }
  const categoriasSinEmparejar = lectura.categorias.filter(
    (fila) => !nombresCategoria.has(normalizar(fila.categoria)),
  );

  const descuadres = revisarTotalesImpresos(lectura);

  const suma = (valores: (number | null)[]) =>
    valores.reduce((total: number, valor) => total + (valor ?? 0), 0);

  const cuadres = [
    {
      etiqueta: "Venta del día por sucursal",
      leido: suma(lectura.sucursales.map((fila) => fila.diaVentas)),
      impreso: lectura.totalImpreso?.diaVentas ?? null,
    },
    {
      etiqueta: "Venta del mes por sucursal",
      leido: suma(lectura.sucursales.map((fila) => fila.mesVentas)),
      impreso: lectura.totalImpreso?.mesVentas ?? null,
    },
    {
      etiqueta: "Venta del día por categoría",
      leido: suma(lectura.categorias.map((fila) => fila.ventas)),
      impreso: lectura.kpiDia?.ventas ?? null,
    },
  ];

  const todoCuadra = descuadres.length === 0 && !sinEmparejar.length && !categoriasSinEmparejar.length;

  return (
    <div className="space-y-5">
      <section
        className={`tarjeta px-5 py-4 ${
          todoCuadra ? "bg-exito-tenue text-exito" : "bg-atencion-tenue text-atencion"
        }`}
      >
        <p className="text-sm font-medium">
          {todoCuadra
            ? "La lectura cuadra con los totales que imprime el informe."
            : "Hay algo que revisar antes de guardar."}
        </p>
        <p className="mt-1 text-xs opacity-80">
          {todoCuadra
            ? "Las sumas de sucursales y categorías coinciden con el Total y con el panel de KPI, y todos los nombres se reconocieron."
            : "Abajo está el detalle. Guardar con un descuadre deja el tablero mostrando una cifra que no es la del informe."}
        </p>
      </section>

      <section className="tarjeta overflow-hidden">
        <h2 className="px-5 pt-5 pb-3 text-base font-semibold tracking-[-0.02em]">
          Cuadre contra los totales del informe
        </h2>
        <div className="overflow-x-auto">
          <table className="tabla min-w-[560px]">
            <thead>
              <tr>
                <th className="text-left">Bloque</th>
                <th>Suma de lo leído</th>
                <th>Total impreso</th>
                <th>Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {cuadres.map((cuadre) => {
                const diferencia =
                  cuadre.impreso === null ? null : cuadre.leido - cuadre.impreso;
                return (
                  <tr key={cuadre.etiqueta}>
                    <td className="text-left">{cuadre.etiqueta}</td>
                    <td>{moneda(cuadre.leido)}</td>
                    <td>{moneda(cuadre.impreso)}</td>
                    <td
                      className={
                        diferencia === null || Math.abs(diferencia) > (cuadre.impreso ?? 0) * 0.005
                          ? "font-medium text-alerta"
                          : "text-exito"
                      }
                    >
                      {diferencia === null ? "—" : diferencia === 0 ? "cuadra" : moneda(diferencia)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Bloque
          titulo="Sucursales"
          valor={`${filas.length - sinEmparejar.length} de ${filas.length}`}
          nota={
            sinEmparejar.length
              ? `Sin reconocer: ${sinEmparejar.map((entrada) => entrada.fila.sucursal).join(", ")}`
              : "Todas reconocidas en el catálogo"
          }
          problema={sinEmparejar.length > 0}
        />
        <Bloque
          titulo="Categorías"
          valor={`${lectura.categorias.length - categoriasSinEmparejar.length} de ${lectura.categorias.length}`}
          nota={
            categoriasSinEmparejar.length
              ? `Sin reconocer: ${categoriasSinEmparejar.map((fila) => fila.categoria).join(", ")}`
              : "Todas reconocidas en el catálogo"
          }
          problema={categoriasSinEmparejar.length > 0}
        />
        <Bloque
          titulo="Productos del top"
          valor={numero(lectura.productos.length)}
          nota={`${lectura.productos.filter((fila) => fila.familia === "PERECEDERO").length} perecederos`}
        />
        <Bloque
          titulo="Días de la serie"
          valor={numero(lectura.serieDiaria.length)}
          nota={
            lectura.serieDiaria.length
              ? `Desde ${fechaCorta(lectura.serieDiaria.at(-1)?.fecha)}`
              : "El informe no trajo comparativos"
          }
        />
      </section>

      <section className="tarjeta overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold tracking-[-0.02em]">Lo que se va a guardar</h2>
          <p className="text-xs text-texto-3">
            Día {lectura.fecha ?? "sin fecha"} · se crean el corte del día y el del acumulado
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="tabla min-w-[820px]">
            <thead>
              <tr>
                <th className="text-left">Sucursal del informe</th>
                <th className="text-left">Se guarda en</th>
                <th>Venta del día</th>
                <th>%MB día</th>
                <th>Venta del mes</th>
                <th>Meta del mes</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ fila, emparejamiento }) => (
                <tr key={fila.sucursal}>
                  <td className="text-left">{fila.sucursal}</td>
                  <td className="text-left">
                    {emparejamiento.tiendaNombre ? (
                      <span className={emparejamiento.exacto ? "" : "text-atencion"}>
                        {emparejamiento.tiendaNombre}
                        {!emparejamiento.exacto && " (por parecido)"}
                      </span>
                    ) : (
                      <span className="text-alerta">no se guarda</span>
                    )}
                  </td>
                  <td>{moneda(fila.diaVentas)}</td>
                  <td>{porcentaje(fila.diaMargenBruto)}</td>
                  <td>{moneda(fila.mesVentas)}</td>
                  <td className={fila.mesMeta === 0 ? "text-texto-3" : ""}>
                    {fila.mesMeta === 0 ? "no cargada" : moneda(fila.mesMeta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-borde-suave px-5 py-3 text-xs text-texto-3">
          El informe trae la columna METAS en cero para todas las sucursales. Eso no es una meta
          de cero: es una meta que el sistema emisor no cargó, y entra como faltante para que el
          tablero muestre el real y deje el cumplimiento en blanco en vez de calcular −100 %.
        </p>
      </section>

      {lectura.observaciones.length > 0 && (
        <section className="tarjeta px-5 py-4">
          <h2 className="text-sm font-medium text-texto-2">Observaciones de la lectura</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-texto-2">
            {lectura.observaciones.map((observacion) => (
              <li key={observacion}>{observacion}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Bloque({
  titulo,
  valor,
  nota,
  problema = false,
}: {
  titulo: string;
  valor: string;
  nota: string;
  problema?: boolean;
}) {
  return (
    <div className="tarjeta px-4 py-3.5">
      <p className="text-xs font-medium tracking-wide text-texto-3 uppercase">{titulo}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] tabular-nums">{valor}</p>
      <p className={`mt-1 text-xs ${problema ? "text-alerta" : "text-texto-3"}`}>{nota}</p>
    </div>
  );
}
