import { EstadoVacio } from "@/components/EstadoVacio";
import { Pestanas } from "@/components/Pestanas";
import { SelectorCorte } from "@/components/SelectorCorte";
import { TablaZonas, type ColumnaTabla } from "@/components/TablaZonas";
import { TarjetaKpi } from "@/components/TarjetaKpi";
import type { FilaAjustes } from "@/lib/calculos";
import { cargarAjustes, listarCortes, resolverCorte } from "@/lib/consultas";
import { ETIQUETA_TIPOLOGIA, TIPOLOGIAS } from "@/lib/dominio";
import { moneda, porcentaje } from "@/lib/formato";

type Resumen = Omit<FilaAjustes, "tiendaId" | "tienda">;

export default async function AjustesPage({ searchParams }: PageProps<"/ajustes">) {
  const parametros = await searchParams;
  const corteId = typeof parametros.corte === "string" ? parametros.corte : undefined;
  const modo = parametros.modo === "monto" ? "monto" : "porcentaje";

  const [cortes, corte] = await Promise.all([listarCortes(), resolverCorte(corteId)]);
  if (!corte) return <EstadoVacio mensaje="No hay cortes cargados todavía." />;

  const ajustes = await cargarAjustes(corte.id);

  const columnas: ColumnaTabla<FilaAjustes, Resumen>[] = [
    ...TIPOLOGIAS.map((tipologia) => ({
      titulo: ETIQUETA_TIPOLOGIA[tipologia],
      numerica: true,
      celda: (fila: FilaAjustes) =>
        modo === "monto"
          ? moneda(fila.montos[tipologia])
          : porcentaje(fila.porcentajes[tipologia], 2),
      resumen: (resumen: Resumen) =>
        modo === "monto"
          ? moneda(resumen.montos[tipologia])
          : porcentaje(resumen.porcentajes[tipologia], 2),
    })),
    {
      titulo: "Total",
      numerica: true,
      celda: (fila) =>
        modo === "monto" ? moneda(fila.totalMonto) : porcentaje(fila.totalPorcentaje, 2),
      resumen: (resumen) =>
        modo === "monto" ? moneda(resumen.totalMonto) : porcentaje(resumen.totalPorcentaje, 2),
    },
  ];

  const mayor = TIPOLOGIAS.map((tipologia) => ({
    tipologia,
    monto: ajustes.total.montos[tipologia] ?? 0,
  })).sort((a, b) => b.monto - a.monto)[0];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Ajustes por Tipología</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Dónde se está perdiendo dinero en {corte.nombre} y de qué forma. El % sobre ventas es
            lo que hace comparable una tienda grande con una pequeña.
          </p>
        </div>
        <SelectorCorte cortes={cortes} actual={corte.id} />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <TarjetaKpi
          etiqueta="Ajustes totales"
          valor={moneda(ajustes.total.totalMonto)}
          detalle={`${porcentaje(ajustes.total.totalPorcentaje, 2)} de las ventas`}
        />
        <TarjetaKpi
          etiqueta="Tipología de mayor impacto"
          valor={ETIQUETA_TIPOLOGIA[mayor.tipologia]}
          detalle={moneda(mayor.monto)}
        />
        <TarjetaKpi
          etiqueta="Ventas del corte"
          valor={moneda(ajustes.total.ventasReal)}
          detalle="Base de todos los porcentajes"
        />
      </section>

      <Pestanas
        pestanas={[
          { clave: "porcentaje", etiqueta: "% sobre ventas" },
          { clave: "monto", etiqueta: "Monto en $" },
        ].map((opcion) => ({
          href: `/ajustes?corte=${corte.id}&modo=${opcion.clave}`,
          etiqueta: opcion.etiqueta,
          activa: modo === opcion.clave,
        }))}
      />

      <TablaZonas zonas={ajustes.zonas} total={ajustes.total} columnas={columnas} />
    </div>
  );
}
