import { EstadoVacio } from "@/components/EstadoVacio";
import { Pestanas } from "@/components/Pestanas";
import { SelectorCorte } from "@/components/SelectorCorte";
import { cargarTiendas, listarCortes, resolverCorte } from "@/lib/consultas";
import { prisma } from "@/lib/db";
import { guardarCapturaManual } from "../acciones";

const CAMPOS = [
  { clave: "ventasMeta", titulo: "Ventas meta" },
  { clave: "ventasReal", titulo: "Ventas real" },
  { clave: "unidadesMeta", titulo: "Unid. meta" },
  { clave: "unidadesReal", titulo: "Unid. real" },
  { clave: "transaccionesMeta", titulo: "Transac. meta" },
  { clave: "transaccionesReal", titulo: "Transac. real" },
  { clave: "margenBrutoMeta", titulo: "%MB meta" },
  { clave: "margenBrutoReal", titulo: "%MB real" },
] as const;

export default async function CapturaManualPage({ searchParams }: PageProps<"/cargar/manual">) {
  const parametros = await searchParams;
  const corteId = typeof parametros.corte === "string" ? parametros.corte : undefined;

  const [cortes, corte, tiendas] = await Promise.all([
    listarCortes(),
    resolverCorte(corteId),
    cargarTiendas(),
  ]);
  if (!corte) return <EstadoVacio mensaje="Crea un corte en Configuración antes de capturar." />;

  const registros = await prisma.registroVentas.findMany({ where: { corteId: corte.id } });
  const porTienda = new Map(registros.map((registro) => [registro.tiendaId, registro]));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Captura manual</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Respaldo cuando no hay documento que leer. Lo que dejes vacío se guarda como faltante y
            aparece marcado en las alertas, no como cero.
          </p>
        </div>
        <SelectorCorte cortes={cortes} actual={corte.id} />
      </header>

      <Pestanas
        pestanas={[
          { href: "/cargar", etiqueta: "Leer un documento", activa: false },
          { href: `/cargar/csv?corte=${corte.id}`, etiqueta: "Importar CSV", activa: false },
          { href: `/cargar/manual?corte=${corte.id}`, etiqueta: "Captura manual", activa: true },
        ]}
      />

      <form action={guardarCapturaManual} className="space-y-4">
        <input type="hidden" name="corteId" value={corte.id} />

        <div className="tarjeta overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th className="text-left">Tienda</th>
                {CAMPOS.map((campo) => (
                  <th key={campo.clave} className="text-right">
                    {campo.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tiendas.map((tienda) => {
                const registro = porTienda.get(tienda.id);
                return (
                  <tr key={tienda.id}>
                    <td className="whitespace-nowrap">
                      <input type="hidden" name="tiendaId" value={tienda.id} />
                      {tienda.nombre}
                      <span className="block text-xs text-texto-3">{tienda.zona.nombre}</span>
                    </td>
                    {CAMPOS.map((campo) => (
                      <td key={campo.clave}>
                        <input
                          type="number"
                          step="any"
                          name={`${tienda.id}.${campo.clave}`}
                          defaultValue={registro?.[campo.clave] ?? ""}
                          className="campo w-28 text-right"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="boton boton-primario">
            Guardar corte
          </button>
        </div>
      </form>
    </div>
  );
}
