import Link from "next/link";
import { EstadoVacio } from "@/components/EstadoVacio";
import { TarjetaKpi } from "@/components/TarjetaKpi";
import { cargarTablero, resolverCorte } from "@/lib/consultas";
import { prisma } from "@/lib/db";
import { ETIQUETA_TIPO_ALERTA, type TipoAlerta } from "@/lib/dominio";
import {
  CLASES_TONO,
  fechaCorta,
  moneda,
  numero,
  porcentaje,
  tonoCumplimiento,
} from "@/lib/formato";

// Pantalla de inicio: gestión por excepción. Lo primero que se ve es lo que se salió de rango,
// no las 24 tiendas en orden.
export default async function InicioPage() {
  const [perfil, corte] = await Promise.all([
    prisma.perfil.findUnique({ where: { id: "maestro" } }),
    resolverCorte(),
  ]);

  if (!corte) {
    return (
      <EstadoVacio mensaje="Todavía no hay cortes cargados. Empieza subiendo el Dashboard Ejecutivo en Cargar datos." />
    );
  }

  const [tablero, alertas] = await Promise.all([
    cargarTablero(corte.id),
    prisma.alerta.findMany({
      where: { corteId: corte.id, estado: "ABIERTA" },
      include: { tienda: true },
      orderBy: [{ severidad: "asc" }, { creadaEn: "desc" }],
      take: 4,
    }),
  ]);

  const abiertas = await prisma.alerta.count({
    where: { corteId: corte.id, estado: "ABIERTA" },
  });

  const tiendas = tablero.zonas.flatMap((zona) =>
    zona.tiendas.map((tienda) => ({ ...tienda, zona: zona.zona })),
  );

  const bajoMeta = tiendas
    .filter((tienda) => tienda.brechaVentas !== null && tienda.brechaVentas < 0)
    .sort((a, b) => (a.brechaVentas ?? 0) - (b.brechaVentas ?? 0))
    .slice(0, 6);

  const oportunidad = bajoMeta.reduce((total, tienda) => total + (tienda.brechaVentas ?? 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Hola, {(perfil?.nombre ?? "").split(" ")[0] || "bienvenido"}</h1>
        <p className="mt-1 text-sm text-texto-2">
          {corte.nombre} · cerrado al {fechaCorta(corte.fechaFin)}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi
          etiqueta="Ventas de la cadena"
          valor={moneda(tablero.total.ventasReal)}
          cumplimiento={tablero.total.cumplimientoVentas}
        />
        <TarjetaKpi
          etiqueta="Brecha contra meta"
          valor={moneda(tablero.total.brechaVentas)}
          detalle={`${bajoMeta.length} tiendas por debajo`}
        />
        <TarjetaKpi
          etiqueta="Oportunidad recuperable"
          valor={moneda(Math.abs(oportunidad))}
          detalle="Suma de las brechas negativas"
        />
        <TarjetaKpi
          etiqueta="Alertas abiertas"
          valor={numero(abiertas)}
          detalle="Inconsistencias sin atender"
        />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="tarjeta p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Requiere tu atención</h2>
            <Link href="/alertas" className="text-xs text-acento hover:underline">
              Ver todas
            </Link>
          </div>
          {alertas.length === 0 ? (
            <p className="py-6 text-center text-sm text-texto-3">
              Sin alertas abiertas en este corte.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {alertas.map((alerta) => (
                <li key={alerta.id} className="border-b border-borde-suave pb-2.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`chip ${
                        alerta.severidad === "ALTA"
                          ? "bg-alerta-tenue text-alerta"
                          : "bg-atencion-tenue text-atencion"
                      }`}
                    >
                      {ETIQUETA_TIPO_ALERTA[alerta.tipo as TipoAlerta] ?? alerta.tipo}
                    </span>
                    {alerta.tienda && (
                      <span className="text-sm font-medium">{alerta.tienda.nombre}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-texto-2">{alerta.mensaje}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="tarjeta p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Tiendas por debajo de meta</h2>
            <Link href="/tablero" className="text-xs text-acento hover:underline">
              Ver tablero
            </Link>
          </div>
          {bajoMeta.length === 0 ? (
            <p className="py-6 text-center text-sm text-texto-3">
              Todas las tiendas cerraron en meta.
            </p>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th className="text-left">Tienda</th>
                  <th className="text-right">Cumpl.</th>
                  <th className="text-right">Brecha</th>
                </tr>
              </thead>
              <tbody>
                {bajoMeta.map((tienda) => (
                  <tr key={tienda.tiendaId}>
                    <td>
                      {tienda.tienda}
                      <span className="ml-2 text-xs text-texto-3">{tienda.zona}</span>
                    </td>
                    <td className="cifra">
                      <span className={`chip ${CLASES_TONO[tonoCumplimiento(tienda.cumplimientoVentas)]}`}>
                        {porcentaje(tienda.cumplimientoVentas)}
                      </span>
                    </td>
                    <td className="cifra text-alerta">{moneda(tienda.brechaVentas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
