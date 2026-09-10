import { EstadoVacio } from "@/components/EstadoVacio";
import { SelectorCorte } from "@/components/SelectorCorte";
import { prisma } from "@/lib/db";
import { listarCortes, resolverCorte } from "@/lib/consultas";
import {
  ETIQUETA_ESTADO_ALERTA,
  ETIQUETA_TIPO_ALERTA,
  type EstadoAlerta,
  type TipoAlerta,
} from "@/lib/dominio";
import { numero } from "@/lib/formato";
import { cambiarEstadoAlerta, revisarCorte } from "./acciones";

const TONO_SEVERIDAD: Record<string, string> = {
  ALTA: "bg-alerta-tenue text-alerta",
  MEDIA: "bg-atencion-tenue text-atencion",
  BAJA: "bg-superficie-3 text-texto-2",
};

export default async function AlertasPage({ searchParams }: PageProps<"/alertas">) {
  const parametros = await searchParams;
  const corteId = typeof parametros.corte === "string" ? parametros.corte : undefined;

  const [cortes, corte] = await Promise.all([listarCortes(), resolverCorte(corteId)]);
  if (!corte) return <EstadoVacio mensaje="No hay cortes cargados todavía." />;

  const alertas = await prisma.alerta.findMany({
    where: { corteId: corte.id },
    include: { tienda: true },
    orderBy: [{ estado: "asc" }, { severidad: "asc" }, { creadaEn: "desc" }],
  });

  const abiertas = alertas.filter((alerta) => alerta.estado === "ABIERTA");
  const resueltas = alertas.filter((alerta) => alerta.estado !== "ABIERTA");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Alertas del corte</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Inconsistencias detectadas en la data de {corte.nombre}. La app las marca y las
            explica; corregirlas o descartarlas es decisión tuya.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <SelectorCorte cortes={cortes} actual={corte.id} />
          <form action={revisarCorte}>
            <input type="hidden" name="corteId" value={corte.id} />
            <button type="submit" className="boton boton-primario no-imprimir">
              Revisar corte
            </button>
          </form>
        </div>
      </header>

      {alertas.length === 0 ? (
        <EstadoVacio mensaje='Sin alertas registradas. Pulsa "Revisar corte" para analizar la data de este período.' />
      ) : (
        <>
          <section className="flex flex-wrap gap-2">
            <span className="chip bg-alerta-tenue text-alerta">
              {numero(abiertas.filter((a) => a.severidad === "ALTA").length)} de severidad alta
            </span>
            <span className="chip bg-atencion-tenue text-atencion">
              {numero(abiertas.filter((a) => a.severidad === "MEDIA").length)} de severidad media
            </span>
            <span className="chip bg-superficie-3 text-texto-2">
              {numero(resueltas.length)} ya atendidas
            </span>
          </section>

          <section className="space-y-2">
            {abiertas.map((alerta) => (
              <FichaAlerta key={alerta.id} alerta={alerta} />
            ))}
            {abiertas.length === 0 && (
              <EstadoVacio mensaje="No queda ninguna alerta abierta en este corte." />
            )}
          </section>

          {resueltas.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-texto-2">Ya atendidas</h2>
              {resueltas.map((alerta) => (
                <FichaAlerta key={alerta.id} alerta={alerta} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

type AlertaConTienda = {
  id: string;
  tipo: string;
  severidad: string;
  estado: string;
  mensaje: string;
  indicador: string | null;
  valorObservado: number | null;
  valorEsperado: number | null;
  tienda: { nombre: string } | null;
};

function FichaAlerta({ alerta }: { alerta: AlertaConTienda }) {
  const abierta = alerta.estado === "ABIERTA";

  return (
    <article className={`tarjeta px-4 py-3.5 ${abierta ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`chip ${TONO_SEVERIDAD[alerta.severidad]}`}>
              {ETIQUETA_TIPO_ALERTA[alerta.tipo as TipoAlerta] ?? alerta.tipo}
            </span>
            {alerta.tienda && (
              <span className="text-sm font-medium">{alerta.tienda.nombre}</span>
            )}
            {!abierta && (
              <span className="chip bg-superficie-3 text-texto-2">
                {ETIQUETA_ESTADO_ALERTA[alerta.estado as EstadoAlerta]}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-texto-2">{alerta.mensaje}</p>
        </div>

        {abierta && (
          <div className="no-imprimir flex gap-2">
            <form action={cambiarEstadoAlerta}>
              <input type="hidden" name="id" value={alerta.id} />
              <input type="hidden" name="estado" value="REVISADA" />
              <button type="submit" className="boton boton-secundario">
                Revisada
              </button>
            </form>
            <form action={cambiarEstadoAlerta}>
              <input type="hidden" name="id" value={alerta.id} />
              <input type="hidden" name="estado" value="DESCARTADA" />
              <button type="submit" className="boton boton-secundario">
                Descartar
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
