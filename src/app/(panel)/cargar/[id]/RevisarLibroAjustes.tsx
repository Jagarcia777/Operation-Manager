import Link from "next/link";
import { prisma } from "@/lib/db";
import { datosDelCorte } from "@/lib/extraccion/guardarCategorias";
import type { LecturaLibroAjustes } from "@/lib/extraccion/libroAjustes";
import { moneda, numero, porcentaje } from "@/lib/formato";
import { confirmarExtraccion } from "../acciones";

const sumar = (valores: (number | null)[]) =>
  valores.reduce<number>((total, valor) => total + (valor ?? 0), 0);
const sobre = (parte: number | null, base: number | null) =>
  parte !== null && base ? (parte / base) * 100 : null;

/**
 * Revisión del libro de ajustes. Las cifras son las del libro; lo que cambia es la cuenta: el
 * % se mide en dólares sobre la venta, y se enseña junto al que imprime el libro para que la
 * diferencia se vea antes de guardar.
 */
export async function RevisarLibroAjustes({
  extraccionId,
  archivoNombre,
  lectura,
}: {
  extraccionId: string;
  archivoNombre: string;
  lectura: LecturaLibroAjustes;
}) {
  const corteDestino =
    lectura.desde && lectura.hasta ? datosDelCorte(lectura.desde, lectura.hasta) : null;
  const corte = corteDestino
    ? await prisma.corte.findUnique({ where: { nombre: corteDestino.nombre } })
    : null;

  const zona = {
    ventas: sumar(lectura.tiendas.map((tienda) => tienda.ventas)),
    unidades: sumar(lectura.tiendas.map((tienda) => tienda.unidades)),
    monto: sumar(lectura.tiendas.map((tienda) => tienda.monto)),
  };
  const centros = lectura.sucursales.filter((sucursal) => sucursal.esCentro);

  // Dónde se ajusta en la zona: la suma de las tiendas por categoría, contra su propia venta.
  const porCategoria = new Map<string, { ventas: number; monto: number }>();
  for (const bloque of lectura.categoriasTiendas) {
    for (const fila of bloque.categorias) {
      const actual = porCategoria.get(fila.categoria) ?? { ventas: 0, monto: 0 };
      actual.ventas += fila.ventas ?? 0;
      actual.monto += fila.monto ?? 0;
      porCategoria.set(fila.categoria, actual);
    }
  }
  const cadenaPorCategoria = new Map(
    lectura.categoriasCadena.map((fila) => [fila.categoria, fila]),
  );
  const magnitudCategorias = [...porCategoria.values()].reduce(
    (total, fila) => total + Math.abs(fila.monto),
    0,
  );
  const categorias = [...porCategoria]
    .sort((a, b) => Math.abs(b[1].monto) - Math.abs(a[1].monto))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Revisar libro de ajustes</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          {archivoNombre}. Leído directo del Excel: se toman la venta, las unidades y los dólares a
          costo, y la aplicación calcula los porcentajes en dólares sobre la venta.
        </p>
      </header>

      <section className="tarjeta grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="text-sm">
          <p className="text-texto-2">Período</p>
          <p className="mt-1.5 font-medium">{corteDestino?.nombre ?? "Sin período"}</p>
          <p className="mt-1 text-xs text-texto-3">
            {corte ? "Corte existente" : "Se crea el corte"}
          </p>
        </div>
        <div className="text-sm">
          <p className="text-texto-2">Zona Oriente · 6 tiendas</p>
          <p className="mt-1.5 font-medium tabular-nums">
            {moneda(zona.monto)} · {porcentaje(sobre(zona.monto, zona.ventas), 2)}
          </p>
          <p className="mt-1 text-xs text-texto-3">sobre {moneda(zona.ventas)} de venta</p>
        </div>
        <div className="text-sm">
          <p className="text-texto-2">Toda la cadena</p>
          <p className="mt-1.5 font-medium tabular-nums">
            {moneda(lectura.cadena.monto)} ·{" "}
            {porcentaje(sobre(lectura.cadena.monto, lectura.cadena.ventas), 2)}
          </p>
          <p className="mt-1 text-xs text-texto-3">
            sobre {moneda(lectura.cadena.ventas)} de venta
          </p>
        </div>
        <div className="text-sm">
          <p className="text-texto-2">Centros de distribución</p>
          {centros.map((centro) => (
            <p key={centro.nombre} className="mt-1.5 tabular-nums">
              <span className="font-medium">{numero(centro.unidades)}</span>{" "}
              <span className="text-xs text-texto-3">
                unid. · {centro.nombre}
                {centro.deLaZona ? " (abastece a Oriente)" : ""}
              </span>
            </p>
          ))}
        </div>
      </section>

      {lectura.observaciones.length > 0 && (
        <section className="tarjeta bg-atencion-tenue px-4 py-3">
          <h2 className="text-sm font-semibold text-atencion">
            Lo que no cuadra en el libro · se guarda como alerta
          </h2>
          <ul className="mt-1.5 space-y-1 text-sm text-atencion">
            {lectura.observaciones.map((hallazgo) => (
              <li key={hallazgo.indicador}>· {hallazgo.mensaje}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="tarjeta overflow-x-auto">
        <table className="tabla min-w-[760px]">
          <thead>
            <tr>
              <th className="text-left">Tienda</th>
              <th>Venta</th>
              <th>Unidades ajustadas</th>
              <th>Ajuste a costo</th>
              <th>% sobre venta</th>
              <th>% del libro</th>
            </tr>
          </thead>
          <tbody>
            {lectura.tiendas.map((tienda) => (
              <tr key={tienda.nombre}>
                <td className="text-left">{tienda.nombre}</td>
                <td>{moneda(tienda.ventas)}</td>
                <td>{numero(tienda.unidades)}</td>
                <td>{moneda(tienda.monto)}</td>
                <td className="font-medium">{porcentaje(sobre(tienda.monto, tienda.ventas), 2)}</td>
                <td className="text-texto-3">
                  {porcentaje(sobre(tienda.unidades, tienda.ventas), 2)}
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="text-left">Zona Oriente</td>
              <td>{moneda(zona.ventas)}</td>
              <td>{numero(zona.unidades)}</td>
              <td>{moneda(zona.monto)}</td>
              <td>{porcentaje(sobre(zona.monto, zona.ventas), 2)}</td>
              <td className="text-texto-3">{porcentaje(sobre(zona.unidades, zona.ventas), 2)}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <p className="-mt-3 text-xs text-texto-3">
        «% del libro» es unidades entre dólares, como lo calcula el Excel; se muestra solo para
        comparar. La aplicación usa «% sobre venta».
      </p>

      {categorias.length > 0 && (
        <section className="tarjeta overflow-x-auto">
          <h2 className="px-5 pt-5 pb-3 text-base font-semibold tracking-[-0.02em]">
            Dónde se ajusta en la zona
          </h2>
          <table className="tabla min-w-[640px]">
            <thead>
              <tr>
                <th className="text-left">Categoría</th>
                <th>Ajuste a costo</th>
                <th>Peso en el ajuste</th>
                <th>% de su venta · zona</th>
                <th>% de su venta · cadena</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map(([categoria, valores]) => {
                const cadena = cadenaPorCategoria.get(categoria);
                return (
                  <tr key={categoria}>
                    <td className="text-left">{categoria}</td>
                    <td>{moneda(valores.monto)}</td>
                    <td>{porcentaje(sobre(Math.abs(valores.monto), magnitudCategorias))}</td>
                    <td className="font-medium">{porcentaje(sobre(valores.monto, valores.ventas), 2)}</td>
                    <td className="text-texto-2">
                      {porcentaje(sobre(cadena?.monto ?? null, cadena?.ventas ?? null), 2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <form action={confirmarExtraccion} className="flex flex-wrap items-center justify-end gap-3">
        <input type="hidden" name="extraccionId" value={extraccionId} />
        <Link href="/cargar" className="boton boton-secundario">
          Descartar
        </Link>
        <button type="submit" className="boton boton-primario" disabled={!corteDestino}>
          Guardar en {corteDestino?.nombre ?? "el corte"}
        </button>
      </form>
    </div>
  );
}
