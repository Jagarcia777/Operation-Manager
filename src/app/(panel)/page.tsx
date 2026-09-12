import Link from "next/link";
import { Monograma } from "@/components/Monograma";
import { TarjetaKpi } from "@/components/TarjetaKpi";
import { GraficoBarras } from "@/components/graficos/GraficoBarras";
import { GraficoEvolucion } from "@/components/graficos/GraficoEvolucion";
import { Minigrafico } from "@/components/graficos/Minigrafico";
import { cargarTablero, resolverCorte, serieMensual } from "@/lib/consultas";
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
export default async function InicioPage({ searchParams }: PageProps<"/">) {
  const parametros = await searchParams;
  const recienCargado = parametros.bienvenida === "demo";
  const [perfil, corte] = await Promise.all([
    prisma.perfil.findUnique({ where: { id: "maestro" } }),
    resolverCorte(),
  ]);

  // Primera vez: en vez de un mensaje sin salida, los dos caminos que hay.
  if (!corte) {
    return (
      <div className="mx-auto max-w-2xl py-10 text-center">
        <Monograma iniciales={perfil?.iniciales || "OM"} tamano={52} />
        <h1 className="mt-4 text-2xl">
          {perfil?.marca || "Operation Manager"} está listo
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-texto-2">
          Todavía no hay ningún corte cargado. Puedes empezar por tus propios números o recorrer
          la aplicación con una cadena de demostración para ver cómo queda todo lleno.
        </p>

        <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
          <Link href="/cargar" className="tarjeta tarjeta-pulsable block p-5">
            <p className="text-sm font-semibold">Subir mi primer corte</p>
            <p className="mt-1.5 text-sm text-texto-2">
              El Dashboard Ejecutivo en PDF o imagen; la aplicación lee las cifras por tienda y
              tú confirmas antes de guardar.
            </p>
            <span className="mt-3 inline-block text-sm text-acento-enlace">Ir a Cargar datos →</span>
          </Link>

          <Link
            href="/configuracion?seccion=datos"
            className="tarjeta tarjeta-pulsable block p-5"
          >
            <p className="text-sm font-semibold">Ver una demostración</p>
            <p className="mt-1.5 text-sm text-texto-2">
              Una cadena inventada con seis tiendas y un año de historia, para recorrer los
              tableros, las alertas y los informes con datos dentro.
            </p>
            <span className="mt-3 inline-block text-sm text-acento-enlace">
              Ir a Configuración → Datos →
            </span>
          </Link>
        </div>
      </div>
    );
  }

  const [tablero, alertas, serie, abiertas] = await Promise.all([
    cargarTablero(corte.id),
    prisma.alerta.findMany({
      where: { corteId: corte.id, estado: "ABIERTA" },
      include: { tienda: true },
      orderBy: [{ severidad: "asc" }, { creadaEn: "desc" }],
      take: 4,
    }),
    serieMensual(12),
    prisma.alerta.count({ where: { corteId: corte.id, estado: "ABIERTA" } }),
  ]);

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
      {recienCargado && (
        <div className="tarjeta border-acento-tenue bg-acento-tenue px-4 py-3 text-sm text-acento">
          <strong className="font-semibold">Estás viendo datos de demostración.</strong> Una cadena
          inventada con un año de historia, para recorrer la aplicación llena. Cuando quieras
          poner los tuyos, vacíala desde Configuración → Datos y sube tu primer corte.
        </div>
      )}

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
          grafico={<Minigrafico valores={serie.map((punto) => punto.ventasReal)} />}
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

      {serie.length >= 2 && (
        <section className="tarjeta p-4">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Cómo viene el año</h2>
            <span className="text-xs text-texto-3">
              Últimos {serie.length} cierres de mes de la zona
            </span>
          </div>
          <GraficoEvolucion
            puntos={serie.map((punto) => ({
              etiqueta: punto.etiqueta,
              meta: punto.ventasMeta,
              real: punto.ventasReal,
            }))}
          />
        </section>
      )}

      <section className="tarjeta p-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Meta contra real, tienda por tienda</h2>
          <span className="text-xs text-texto-3">{corte.nombre}</span>
        </div>
        <GraficoBarras
          barras={tiendas.map((tienda) => ({
            etiqueta: tienda.tienda,
            meta: tienda.ventasMeta,
            real: tienda.ventasReal,
          }))}
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
