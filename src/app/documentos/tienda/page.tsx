import { BarraExportar } from "@/components/BarraExportar";
import { EstadoVacio } from "@/components/EstadoVacio";
import { TarjetaKpi } from "@/components/TarjetaKpi";
import { datosPresentacionTienda } from "@/lib/documentos/datos";
import { fechaCorta, moneda, numero, porcentaje, variacion } from "@/lib/formato";

export default async function PresentacionTiendaPage({
  searchParams,
}: PageProps<"/documentos/tienda">) {
  const parametros = await searchParams;
  const corteId = typeof parametros.corte === "string" ? parametros.corte : "";
  const tiendaId = typeof parametros.tienda === "string" ? parametros.tienda : "";

  const datos = corteId && tiendaId ? await datosPresentacionTienda(corteId, tiendaId) : null;
  if (!datos) {
    return <EstadoVacio mensaje="Elige un corte y una tienda en Documentos para generar la presentación." />;
  }

  const { fila, tienda, corte, subtotalZona, totalCadena } = datos;
  const consulta = `corte=${corteId}&tienda=${tiendaId}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">{tienda.nombre}</h1>
          <p className="mt-1 text-sm text-texto-2">
            {tienda.zona.nombre} · {corte.nombre} · cierre al {fechaCorta(corte.fechaFin)}
          </p>
        </div>
        <BarraExportar
          pptxHref={`/api/documentos/pptx?tipo=tienda&${consulta}`}
          docxHref={`/api/documentos/docx?tipo=tienda&${consulta}`}
        />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi
          etiqueta="Ventas"
          valor={moneda(fila.ventasReal)}
          cumplimiento={fila.cumplimientoVentas}
          detalle={`Meta ${moneda(fila.ventasMeta)}`}
        />
        <TarjetaKpi
          etiqueta="Transacciones"
          valor={numero(fila.transaccionesReal)}
          cumplimiento={fila.cumplimientoTransacciones}
        />
        <TarjetaKpi
          etiqueta="Ticket promedio"
          valor={moneda(fila.ticketPromedio, true)}
          detalle={`Cadena ${moneda(totalCadena.ticketPromedio, true)}`}
        />
        <TarjetaKpi
          etiqueta="Margen bruto"
          valor={porcentaje(fila.margenBrutoReal)}
          detalle={`Cadena ${porcentaje(totalCadena.margenBrutoReal)}`}
        />
      </section>

      <section className="tarjeta p-5">
        <h2 className="text-sm font-semibold">Dónde está parada</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-texto-3">Posición en la cadena</p>
            <p className="mt-0.5 text-lg font-semibold">
              {datos.posicionCadena}.º de {datos.totalTiendas}
            </p>
          </div>
          <div>
            <p className="text-xs text-texto-3">Posición en su zona</p>
            <p className="mt-0.5 text-lg font-semibold">
              {datos.posicionZona}.º de {datos.tiendasEnZona}
            </p>
          </div>
          <div>
            <p className="text-xs text-texto-3">
              Contra {datos.corteAnterior?.nombre ?? "el corte anterior"}
            </p>
            <p
              className={`mt-0.5 text-lg font-semibold ${
                (datos.variacionVentas ?? 0) >= 0 ? "text-exito" : "text-alerta"
              }`}
            >
              {variacion(datos.variacionVentas)}
            </p>
          </div>
        </div>
        <p className="mt-4 border-t border-borde-suave pt-3 text-sm text-texto-2">
          La zona cerró en {porcentaje(subtotalZona?.cumplimientoVentas ?? null)} de su meta y la
          cadena en {porcentaje(totalCadena.cumplimientoVentas)}. La brecha de esta tienda contra
          su propia meta es de {moneda(fila.brechaVentas)}, con {numero(fila.upt, 2)} unidades por
          transacción.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-texto-2">Dónde se pierde dinero</h2>
        <div className="tarjeta overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th className="text-left">Tipología</th>
                <th className="text-right">Monto</th>
                <th className="text-right">% de ventas</th>
                <th className="text-right">Mediana cadena</th>
                <th className="text-left">Lectura</th>
              </tr>
            </thead>
            <tbody>
              {datos.ajustes.map((ajuste) => {
                const excede =
                  ajuste.porcentaje !== null &&
                  ajuste.medianaCadena !== null &&
                  ajuste.porcentaje > ajuste.medianaCadena * 2;
                return (
                  <tr key={ajuste.tipologia}>
                    <td>{ajuste.etiqueta}</td>
                    <td className="cifra">{moneda(ajuste.monto)}</td>
                    <td className="cifra">{porcentaje(ajuste.porcentaje, 2)}</td>
                    <td className="cifra text-texto-3">
                      {porcentaje(ajuste.medianaCadena, 2)}
                    </td>
                    <td className={excede ? "text-alerta" : "text-texto-3"}>
                      {excede ? "Muy por encima de la cadena" : "En rango"}
                    </td>
                  </tr>
                );
              })}
              <tr className="fila-total">
                <td>Total ajustes</td>
                <td className="cifra">
                  {moneda(datos.ajustes.reduce((suma, a) => suma + (a.monto ?? 0), 0))}
                </td>
                <td className="cifra">{porcentaje(datos.ajusteTotal, 2)}</td>
                <td />
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-texto-2">Plan de acción</h2>
        {datos.planes.length === 0 ? (
          <EstadoVacio mensaje="Esta tienda no tiene un plan de acción abierto." />
        ) : (
          datos.planes.map((plan) => (
            <article key={plan.id} className="tarjeta p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{plan.titulo}</p>
                <span className="text-sm font-medium">{moneda(plan.oportunidadUsd)}</span>
              </div>
              {plan.diagnostico && (
                <p className="mt-1.5 text-sm text-texto-2">{plan.diagnostico}</p>
              )}
              {plan.metas.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-texto-2">
                  {plan.metas.map((meta) => (
                    <li key={meta.id}>
                      · {meta.indicador}: {numero(meta.valorActual, 2)} →{" "}
                      <span className="font-medium text-texto">
                        {numero(meta.valorObjetivo, 2)}
                      </span>{" "}
                      {meta.unidad === "PORCENTAJE" ? "%" : meta.unidad === "USD" ? "$" : ""}
                    </li>
                  ))}
                </ul>
              )}
              {plan.hitos.length > 0 && (
                <div className="mt-3 grid gap-3 border-t border-borde-suave pt-3 sm:grid-cols-3">
                  {[1, 2, 3].map((mes) => (
                    <div key={mes}>
                      <p className="text-xs font-medium text-texto-3">Mes {mes}</p>
                      <ul className="mt-1 space-y-1 text-sm text-texto-2">
                        {plan.hitos
                          .filter((hito) => hito.mes === mes)
                          .map((hito) => (
                            <li key={hito.id}>· {hito.descripcion}</li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
