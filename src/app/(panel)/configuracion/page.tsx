import { Monograma } from "@/components/Monograma";
import { Pestanas } from "@/components/Pestanas";
import { prisma } from "@/lib/db";
import { ESTADOS_CORTE, ETIQUETA_ESTADO_CORTE, ETIQUETA_TIPO_CORTE, TIPOS_CORTE } from "@/lib/dominio";
import { fechaCorta } from "@/lib/formato";
import {
  agregarNota,
  cargarDatosDemo,
  vaciarAplicacion,
  archivarNota,
  cambiarEstadoCorte,
  crearCorte,
  eliminarCorte,
  guardarBenchmark,
  guardarPerfil,
  guardarTienda,
  guardarUmbral,
  guardarZona,
} from "./acciones";

const SECCIONES = [
  { clave: "perfil", etiqueta: "Perfil" },
  { clave: "catalogo", etiqueta: "Zonas y tiendas" },
  { clave: "cortes", etiqueta: "Cortes" },
  { clave: "umbrales", etiqueta: "Umbrales de alerta" },
  { clave: "benchmarks", etiqueta: "Benchmarks" },
  { clave: "memoria", etiqueta: "Memoria operativa" },
  { clave: "datos", etiqueta: "Datos" },
];

function paraInput(fecha: Date | null | undefined) {
  return fecha ? fecha.toISOString().slice(0, 10) : "";
}

export default async function ConfiguracionPage({ searchParams }: PageProps<"/configuracion">) {
  const parametros = await searchParams;
  const seccion = typeof parametros.seccion === "string" ? parametros.seccion : "perfil";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Configuración</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          Todo lo que la aplicación da por sabido se edita aquí: tu perfil, el catálogo de la
          cadena, los cortes, los umbrales de alerta y lo que sabes de cada tienda.
        </p>
      </header>

      <Pestanas
        pestanas={SECCIONES.map((opcion) => ({
          href: `/configuracion?seccion=${opcion.clave}`,
          etiqueta: opcion.etiqueta,
          activa: seccion === opcion.clave,
        }))}
      />

      {seccion === "catalogo" && <SeccionCatalogo />}
      {seccion === "cortes" && <SeccionCortes />}
      {seccion === "umbrales" && <SeccionUmbrales />}
      {seccion === "benchmarks" && <SeccionBenchmarks />}
      {seccion === "memoria" && <SeccionMemoria />}
      {seccion === "datos" && (
        <SeccionDatos
          error={typeof parametros.error === "string" ? parametros.error : null}
          hecho={typeof parametros.hecho === "string" ? parametros.hecho : null}
        />
      )}
      {!["catalogo", "cortes", "umbrales", "benchmarks", "memoria", "datos"].includes(seccion) && (
        <SeccionPerfil />
      )}
    </div>
  );
}

async function SeccionPerfil() {
  const [perfil, zonas] = await Promise.all([
    prisma.perfil.findUnique({ where: { id: "maestro" } }),
    prisma.zona.findMany({ orderBy: { orden: "asc" } }),
  ]);

  return (
    <form action={guardarPerfil} className="tarjeta max-w-3xl space-y-4 p-5">
      <div className="flex items-center gap-3 border-b border-borde-suave pb-4">
        <Monograma iniciales={perfil?.iniciales || "OM"} tamano={44} />
        <div>
          <p className="text-sm font-medium">{perfil?.marca || "Sin marca definida"}</p>
          <p className="text-xs text-texto-3">Así se firma la herramienta y lo que produce.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-texto-2">Marca</span>
          <input
            name="marca"
            defaultValue={perfil?.marca ?? ""}
            placeholder="JG Operaciones"
            className="campo mt-1.5"
          />
        </label>
        <label className="block text-sm">
          <span className="text-texto-2">Monograma</span>
          <input
            name="iniciales"
            maxLength={2}
            defaultValue={perfil?.iniciales ?? ""}
            placeholder="JG"
            className="campo mt-1.5 uppercase"
          />
        </label>
        <div />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-texto-2">Nombre</span>
          <input name="nombre" defaultValue={perfil?.nombre ?? ""} className="campo mt-1.5" />
        </label>
        <label className="block text-sm">
          <span className="text-texto-2">Cargo</span>
          <input name="cargo" defaultValue={perfil?.cargo ?? ""} className="campo mt-1.5" />
        </label>
        <label className="block text-sm">
          <span className="text-texto-2">Zona a tu cargo</span>
          <select
            name="zonaPropiaId"
            defaultValue={perfil?.zonaPropiaId ?? ""}
            className="campo mt-1.5"
          >
            <option value="">Ninguna</option>
            {zonas.map((zona) => (
              <option key={zona.id} value={zona.id}>
                {zona.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-texto-2">Contexto de tu trabajo</span>
        <p className="mt-0.5 text-xs text-texto-3">
          Qué haces con estos números y para quién. El análisis lo usa para hablarte en tus
          términos.
        </p>
        <textarea
          name="contexto"
          rows={4}
          defaultValue={perfil?.contexto ?? ""}
          className="campo mt-1.5"
        />
      </label>

      <label className="block text-sm">
        <span className="text-texto-2">Instrucciones para el análisis</span>
        <p className="mt-0.5 text-xs text-texto-3">
          Cómo quieres que lea los cortes: qué priorizar, qué no te sirve, qué nivel de detalle.
        </p>
        <textarea
          name="instruccionesCerebro"
          rows={4}
          defaultValue={perfil?.instruccionesCerebro ?? ""}
          className="campo mt-1.5"
        />
      </label>

      <div className="flex justify-end">
        <button type="submit" className="boton boton-primario">
          Guardar perfil
        </button>
      </div>
    </form>
  );
}

async function SeccionCatalogo() {
  const zonas = await prisma.zona.findMany({
    include: { tiendas: { orderBy: { orden: "asc" } } },
    orderBy: { orden: "asc" },
  });

  return (
    <div className="space-y-5">
      <form action={guardarZona} className="tarjeta flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm">
          <span className="text-texto-2">Nueva zona</span>
          <input name="nombre" placeholder="Zona" className="campo mt-1.5 w-56" required />
        </label>
        <label className="text-sm">
          <span className="text-texto-2">Gerente</span>
          <input name="gerente" placeholder="Nombre" className="campo mt-1.5 w-56" required />
        </label>
        <button type="submit" className="boton boton-secundario">
          Agregar zona
        </button>
      </form>

      {zonas.map((zona) => (
        <section key={zona.id} className="tarjeta overflow-hidden">
          <div className="flex items-center justify-between border-b border-borde-suave bg-superficie-2 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{zona.nombre}</p>
              <p className="text-xs text-texto-3">
                {zona.gerente} · {zona.tiendas.length} tiendas
              </p>
            </div>
          </div>

          <div className="divide-y divide-borde-suave">
            {zona.tiendas.map((tienda) => (
              <form
                key={tienda.id}
                action={guardarTienda}
                className="flex flex-wrap items-end gap-2 px-4 py-3"
              >
                <input type="hidden" name="id" value={tienda.id} />
                <input type="hidden" name="zonaId" value={zona.id} />
                <label className="text-xs text-texto-3">
                  Nombre
                  <input name="nombre" defaultValue={tienda.nombre} className="campo mt-1 w-40" />
                </label>
                <label className="text-xs text-texto-3">
                  Código
                  <input
                    name="codigo"
                    defaultValue={tienda.codigo ?? ""}
                    className="campo mt-1 w-20"
                  />
                </label>
                <label className="text-xs text-texto-3" title="Otros nombres con los que aparece en los reportes, separados por coma">
                  Otros nombres
                  <input
                    name="alias"
                    defaultValue={tienda.alias ?? ""}
                    placeholder="SUC. LECHERÍA"
                    className="campo mt-1 w-40"
                  />
                </label>
                <label className="text-xs text-texto-3">
                  Ciudad
                  <input
                    name="ciudad"
                    defaultValue={tienda.ciudad ?? ""}
                    className="campo mt-1 w-32"
                  />
                </label>
                <label className="text-xs text-texto-3">
                  m²
                  <input
                    name="metrosCuadrados"
                    type="number"
                    step="any"
                    defaultValue={tienda.metrosCuadrados ?? ""}
                    className="campo mt-1 w-24"
                  />
                </label>
                <label className="text-xs text-texto-3">
                  Apertura
                  <input
                    name="fechaApertura"
                    type="date"
                    defaultValue={paraInput(tienda.fechaApertura)}
                    className="campo mt-1 w-36"
                  />
                </label>
                <label className="flex items-center gap-1.5 pb-2 text-xs text-texto-3">
                  <input type="checkbox" name="activa" defaultChecked={tienda.activa} />
                  Activa
                </label>
                <button type="submit" className="boton boton-secundario">
                  Guardar
                </button>
              </form>
            ))}
          </div>

          <form
            action={guardarTienda}
            className="flex flex-wrap items-end gap-2 border-t border-borde-suave bg-superficie-2 px-4 py-3"
          >
            <input type="hidden" name="zonaId" value={zona.id} />
            <input type="hidden" name="activa" value="on" />
            <label className="text-xs text-texto-3">
              Nueva tienda
              <input name="nombre" placeholder="Nombre" className="campo mt-1 w-48" required />
            </label>
            <label className="text-xs text-texto-3">
              Código
              <input name="codigo" className="campo mt-1 w-20" />
            </label>
            <button type="submit" className="boton boton-secundario">
              Agregar
            </button>
          </form>
        </section>
      ))}
    </div>
  );
}

async function SeccionCortes() {
  const cortes = await prisma.corte.findMany({
    orderBy: { fechaFin: "desc" },
    include: { _count: { select: { ventas: true, ajustes: true, alertas: true } } },
  });

  return (
    <div className="space-y-4">
      <form action={crearCorte} className="tarjeta flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm">
          <span className="text-texto-2">Nombre</span>
          <input
            name="nombre"
            placeholder="Cierre Septiembre 2026"
            className="campo mt-1.5 w-56"
            required
          />
        </label>
        <label className="text-sm">
          <span className="text-texto-2">Tipo</span>
          <select name="tipo" className="campo mt-1.5 w-40">
            {TIPOS_CORTE.map((tipo) => (
              <option key={tipo} value={tipo}>
                {ETIQUETA_TIPO_CORTE[tipo]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-texto-2">Desde</span>
          <input name="fechaInicio" type="date" className="campo mt-1.5 w-40" required />
        </label>
        <label className="text-sm">
          <span className="text-texto-2">Hasta</span>
          <input name="fechaFin" type="date" className="campo mt-1.5 w-40" required />
        </label>
        <label className="text-sm">
          <span className="text-texto-2">Días del mes</span>
          <input name="diasDelMes" type="number" className="campo mt-1.5 w-28" />
        </label>
        <label className="text-sm">
          <span className="text-texto-2">Transcurridos</span>
          <input name="diasTranscurridos" type="number" className="campo mt-1.5 w-28" />
        </label>
        <button type="submit" className="boton boton-primario">
          Crear corte
        </button>
      </form>

      <div className="tarjeta divide-y divide-borde-suave">
        {cortes.map((corte) => (
          <div key={corte.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{corte.nombre}</p>
              <p className="text-xs text-texto-3">
                {fechaCorta(corte.fechaInicio)} al {fechaCorta(corte.fechaFin)} ·{" "}
                {ETIQUETA_TIPO_CORTE[corte.tipo as keyof typeof ETIQUETA_TIPO_CORTE] ?? corte.tipo}
                {" · "}
                {corte._count.ventas} tiendas cargadas, {corte._count.ajustes} ajustes,{" "}
                {corte._count.alertas} alertas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <form action={cambiarEstadoCorte} className="flex items-center gap-2">
                <input type="hidden" name="id" value={corte.id} />
                <select name="estado" defaultValue={corte.estado} className="campo w-36">
                  {ESTADOS_CORTE.map((estado) => (
                    <option key={estado} value={estado}>
                      {ETIQUETA_ESTADO_CORTE[estado]}
                    </option>
                  ))}
                </select>
                <button type="submit" className="boton boton-secundario">
                  Aplicar
                </button>
              </form>
              <form action={eliminarCorte}>
                <input type="hidden" name="id" value={corte.id} />
                <button
                  type="submit"
                  className="boton boton-secundario text-alerta"
                  title="Borra el corte con sus registros, ajustes y alertas"
                >
                  Eliminar
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function SeccionUmbrales() {
  const umbrales = await prisma.umbral.findMany({ orderBy: { clave: "asc" } });

  return (
    <div className="tarjeta divide-y divide-borde-suave">
      {umbrales.map((umbral) => (
        <form
          key={umbral.id}
          action={guardarUmbral}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <input type="hidden" name="id" value={umbral.id} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{umbral.etiqueta}</p>
            {umbral.nota && <p className="text-xs text-texto-3">{umbral.nota}</p>}
          </div>
          <div className="flex items-center gap-2">
            <input
              name="valor"
              type="number"
              step="any"
              defaultValue={umbral.valor}
              className="campo w-28 text-right"
            />
            <span className="w-24 text-xs text-texto-3">{umbral.unidad}</span>
            <button type="submit" className="boton boton-secundario">
              Guardar
            </button>
          </div>
        </form>
      ))}
    </div>
  );
}

async function SeccionBenchmarks() {
  const benchmarks = await prisma.benchmark.findMany({ orderBy: { etiqueta: "asc" } });

  return (
    <div className="space-y-3">
      <p className="max-w-2xl text-sm text-texto-2">
        Referencias externas contra las que se mide la operación en el informe ejecutivo. La
        aplicación no las inventa: carga aquí los valores que uses, sean de NRF, IGD o de criterio
        interno. Lo que dejes vacío sale como &laquo;sin referencia&raquo; en el informe.
      </p>

      <div className="tarjeta divide-y divide-borde-suave">
        {benchmarks.map((benchmark) => (
          <form
            key={benchmark.id}
            action={guardarBenchmark}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <input type="hidden" name="id" value={benchmark.id} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{benchmark.etiqueta}</p>
              <p className="text-xs text-texto-3">{benchmark.unidad}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                name="valor"
                type="number"
                step="any"
                defaultValue={benchmark.valor ?? ""}
                placeholder="Sin cargar"
                className="campo w-28 text-right"
              />
              <input
                name="fuente"
                defaultValue={benchmark.fuente}
                className="campo w-28"
                placeholder="Fuente"
              />
              <button type="submit" className="boton boton-secundario">
                Guardar
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}

async function SeccionMemoria() {
  const [notas, tiendas] = await Promise.all([
    prisma.notaMemoria.findMany({
      where: { vigente: true },
      include: { tienda: true },
      orderBy: { creadaEn: "desc" },
    }),
    prisma.tienda.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
  ]);

  return (
    <div className="space-y-4">
      <form action={agregarNota} className="tarjeta space-y-3 p-4">
        <p className="text-sm text-texto-2">
          Lo que sabes y la data no dice: un depósito en obra, un gerente nuevo, una promoción
          local. El análisis lo toma en cuenta al explicar los números.
        </p>
        <textarea name="texto" rows={3} className="campo" required placeholder="Observación" />
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="text-texto-2">Tienda</span>
            <select name="tiendaId" className="campo mt-1.5 w-52">
              <option value="">Toda la cadena</option>
              {tiendas.map((tienda) => (
                <option key={tienda.id} value={tienda.id}>
                  {tienda.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-texto-2">Etiqueta</span>
            <select name="etiqueta" className="campo mt-1.5 w-44">
              <option value="OPERACION">Operación</option>
              <option value="PERSONAL">Personal</option>
              <option value="INVENTARIO">Inventario</option>
              <option value="COMERCIAL">Comercial</option>
              <option value="OTRO">Otro</option>
            </select>
          </label>
          <button type="submit" className="boton boton-primario">
            Guardar nota
          </button>
        </div>
      </form>

      <div className="tarjeta divide-y divide-borde-suave">
        {notas.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-texto-3">
            Todavía no hay notas registradas.
          </p>
        )}
        {notas.map((nota) => (
          <div key={nota.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm">{nota.texto}</p>
              <p className="mt-0.5 text-xs text-texto-3">
                {nota.tienda?.nombre ?? "Cadena"} · {nota.etiqueta ?? "Sin etiqueta"} ·{" "}
                {fechaCorta(nota.creadaEn)}
              </p>
            </div>
            <form action={archivarNota}>
              <input type="hidden" name="id" value={nota.id} />
              <button type="submit" className="boton boton-secundario">
                Archivar
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

async function SeccionDatos({ error, hecho }: { error: string | null; hecho: string | null }) {
  const [cortes, tiendas, registros] = await Promise.all([
    prisma.corte.count(),
    prisma.tienda.count(),
    prisma.registroVentas.count(),
  ]);

  const AVISOS: Record<string, string> = {
    clave: "La contraseña no coincide. Nada se tocó.",
  };

  return (
    <div className="max-w-3xl space-y-4">
      {error && AVISOS[error] && (
        <p className="tarjeta border-alerta-tenue bg-alerta-tenue px-4 py-3 text-sm text-alerta">
          {AVISOS[error]}
        </p>
      )}
      {hecho === "vaciado" && (
        <p className="tarjeta border-exito-tenue bg-exito-tenue px-4 py-3 text-sm text-exito">
          La aplicación quedó vacía. Carga la demostración o sube tu primer corte en Cargar datos.
        </p>
      )}

      <div className="tarjeta p-5">
        <h2 className="text-sm font-semibold">Lo que hay cargado ahora</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { etiqueta: "Cortes", valor: cortes },
            { etiqueta: "Tiendas", valor: tiendas },
            { etiqueta: "Registros de venta", valor: registros },
          ].map((dato) => (
            <div key={dato.etiqueta} className="rounded-lg bg-superficie-2 px-4 py-3">
              <p className="text-xs text-texto-3">{dato.etiqueta}</p>
              <p className="text-xl font-semibold tabular-nums">{dato.valor}</p>
            </div>
          ))}
        </div>
      </div>

      <form action={cargarDatosDemo} className="tarjeta space-y-3 p-5">
        <h2 className="text-sm font-semibold">Cargar datos de demostración</h2>
        <p className="text-sm text-texto-2">
          Borra todo lo que haya y deja la aplicación con una cadena inventada: seis tiendas, un
          año completo de cierres de mes, categorías, ajustes por tipología y planes de acción.
          Sirve para recorrer la herramienta llena antes de meter tus números.
        </p>
        <p className="text-sm text-alerta">
          Esto elimina los datos actuales y no hay forma de recuperarlos. Por eso pide la
          contraseña: para que nadie vacíe la aplicación de un clic.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="text-texto-2">Tu contraseña de acceso</span>
            <input
              name="clave"
              type="password"
              className="campo mt-1.5 w-56"
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" className="boton boton-primario">
            Cargar demostración
          </button>
        </div>
      </form>

      <form action={vaciarAplicacion} className="tarjeta space-y-3 border-alerta-tenue p-5">
        <h2 className="text-sm font-semibold text-alerta">Vaciar la aplicación</h2>
        <p className="text-sm text-texto-2">
          Deja la base sin cortes, sin tiendas y sin perfil, lista para empezar de cero. Las tablas
          se quedan como están: no se toca la estructura, solo el contenido.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="text-texto-2">Tu contraseña de acceso</span>
            <input
              name="clave"
              type="password"
              className="campo mt-1.5 w-56"
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" className="boton boton-secundario text-alerta">
            Vaciar todo
          </button>
        </div>
      </form>
    </div>
  );
}
