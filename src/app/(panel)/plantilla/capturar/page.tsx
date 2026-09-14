import Link from "next/link";
import { EstadoVacio } from "@/components/EstadoVacio";
import { guardarPlantilla } from "@/app/(panel)/plantilla/acciones";
import { cargarAreas, cargarTiendas, listarCortes, resolverCorte } from "@/lib/consultas";
import { prisma } from "@/lib/db";
import { ETIQUETA_KPI_PLANTILLA, UNIDAD_KPI_PLANTILLA, type KpiPlantilla } from "@/lib/dominio";

export const metadata = { title: "Capturar plantilla" };

/** Qué volumen se le pide a cada área. Administración no aparece: su venta la deduce la app. */
const ETIQUETA_VOLUMEN: Record<KpiPlantilla, string> = {
  SPLH: "Ventas $ del área",
  UPLH: "Unidades del período",
  TPLH: "Transacciones",
  COBERTURA: "",
};

export default async function CapturarPlantillaPage({
  searchParams,
}: PageProps<"/plantilla/capturar">) {
  const parametros = await searchParams;
  const corteId = typeof parametros.corte === "string" ? parametros.corte : undefined;
  const tiendaPedida = typeof parametros.tienda === "string" ? parametros.tienda : "";

  const [cortes, corte, tiendas, areas] = await Promise.all([
    listarCortes(),
    resolverCorte(corteId),
    cargarTiendas(),
    cargarAreas(),
  ]);

  if (!corte) return <EstadoVacio mensaje="Crea un corte antes de capturar la plantilla." />;
  if (!tiendas.length) return <EstadoVacio mensaje="No hay tiendas activas." />;

  const tiendaId = tiendas.some((tienda) => tienda.id === tiendaPedida)
    ? tiendaPedida
    : tiendas[0].id;

  const registros = await prisma.registroPlantilla.findMany({
    where: { corteId: corte.id, tiendaId },
  });
  const porArea = new Map(registros.map((registro) => [registro.areaId, registro]));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em]">Capturar plantilla</h1>
          <p className="text-sm text-texto-3">
            Horas y volumen de cada área. Lo demás lo calcula la aplicación.
          </p>
        </div>
        <Link className="boton-secundario" href={`/plantilla?corte=${corte.id}`}>
          Volver
        </Link>
      </header>

      <nav className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {tiendas.map((tienda) => (
            <Link
              key={tienda.id}
              href={`/plantilla/capturar?corte=${corte.id}&tienda=${tienda.id}`}
              className={`chip ${
                tienda.id === tiendaId ? "bg-acento-tenue text-acento" : "bg-superficie-3 text-texto-2"
              }`}
            >
              {tienda.nombre}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cortes.slice(0, 4).map((otro) => (
            <Link
              key={otro.id}
              href={`/plantilla/capturar?corte=${otro.id}&tienda=${tiendaId}`}
              className={`chip ${
                otro.id === corte.id ? "bg-acento-tenue text-acento" : "bg-superficie-3 text-texto-2"
              }`}
            >
              {otro.nombre}
            </Link>
          ))}
        </div>
      </nav>

      <form action={guardarPlantilla} className="space-y-4">
        <input type="hidden" name="corteId" value={corte.id} />
        <input type="hidden" name="tiendaId" value={tiendaId} />

        <div className="tarjeta overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tabla min-w-[1100px]">
              <thead>
                <tr>
                  <th className="text-left">Área</th>
                  <th>Plantilla meta</th>
                  <th>Plantilla activa</th>
                  <th>Horas programadas</th>
                  <th>Horas trabajadas</th>
                  <th>Ausentismo</th>
                  <th>Horas extra</th>
                  <th>Volumen</th>
                  <th>Costo nómina $</th>
                </tr>
              </thead>
              <tbody>
                {areas.map((area) => {
                  const guardado = porArea.get(area.id);
                  const kpi = area.kpi as KpiPlantilla;
                  const volumen =
                    kpi === "SPLH"
                      ? guardado?.ventas
                      : kpi === "UPLH"
                        ? guardado?.unidades
                        : kpi === "TPLH"
                          ? guardado?.transacciones
                          : null;

                  return (
                    <tr key={area.id}>
                      <td className="w-64 min-w-56 text-left">
                        <span className="font-medium">{area.nombre}</span>
                        <span className="block text-xs text-texto-3">
                          {ETIQUETA_KPI_PLANTILLA[kpi]} ·{" "}
                          {area.estandarMin !== null && area.estandarMax !== null
                            ? `referencia ${area.estandarMin}–${area.estandarMax} ${UNIDAD_KPI_PLANTILLA[kpi]}`
                            : area.estandar !== null
                              ? `referencia ${area.estandar} ${UNIDAD_KPI_PLANTILLA[kpi]}`
                              : "referencia por calibrar"}
                        </span>
                      </td>
                      <Celda area={area.id} campo="plantillaMeta" valor={guardado?.plantillaMeta} />
                      <Celda area={area.id} campo="plantillaActiva" valor={guardado?.plantillaActiva} />
                      <Celda area={area.id} campo="horasProgramadas" valor={guardado?.horasProgramadas} />
                      <Celda area={area.id} campo="horasTrabajadas" valor={guardado?.horasTrabajadas} />
                      <Celda area={area.id} campo="horasAusentismo" valor={guardado?.horasAusentismo} />
                      <Celda area={area.id} campo="horasExtra" valor={guardado?.horasExtra} />
                      <td>
                        {kpi === "COBERTURA" ? (
                          <span className="text-xs text-texto-3">se mide por cobertura</span>
                        ) : area.usaVentaTienda ? (
                          <span className="text-xs text-texto-3">venta de la tienda</span>
                        ) : (
                          <input
                            className="campo w-28 text-right tabular-nums"
                            type="number"
                            step="any"
                            min="0"
                            name={`${area.id}.volumen`}
                            defaultValue={volumen ?? ""}
                            aria-label={`${ETIQUETA_VOLUMEN[kpi]} de ${area.nombre}`}
                            placeholder={ETIQUETA_VOLUMEN[kpi]}
                          />
                        )}
                      </td>
                      <Celda area={area.id} campo="costoNomina" valor={guardado?.costoNomina} />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-xs text-texto-3">
            Solo se pide el volumen que mide cada área: una de reposición no necesita ventas y
            Administración no necesita ninguno, porque se compara contra la venta de toda la
            tienda y esa sale de las demás áreas. Un campo vacío queda como faltante, no como
            cero. Si las horas trabajadas no cuadran con programadas menos ausentismo, se
            levanta una alerta al guardar en vez de corregir el dato en silencio.
          </p>
          <button className="boton-primario" type="submit">
            Guardar captura
          </button>
        </div>
      </form>
    </div>
  );
}

function Celda({
  area,
  campo,
  valor,
}: {
  area: string;
  campo: string;
  valor: number | null | undefined;
}) {
  return (
    <td>
      <input
        className="campo w-24 text-right tabular-nums"
        type="number"
        step="any"
        min="0"
        name={`${area}.${campo}`}
        defaultValue={valor ?? ""}
        aria-label={campo}
      />
    </td>
  );
}
