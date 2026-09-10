import { BarraExportar } from "@/components/BarraExportar";
import { EstadoVacio } from "@/components/EstadoVacio";
import { TarjetaKpi } from "@/components/TarjetaKpi";
import { ETIQUETA_TIPOLOGIA, TIPOLOGIAS } from "@/lib/dominio";
import { datosInformeEjecutivo } from "@/lib/documentos/datos";
import { fechaCorta, moneda, numero, porcentaje } from "@/lib/formato";

export default async function InformeEjecutivoPage({
  searchParams,
}: PageProps<"/documentos/ejecutivo">) {
  const parametros = await searchParams;
  const corteId = typeof parametros.corte === "string" ? parametros.corte : "";

  const datos = corteId ? await datosInformeEjecutivo(corteId) : null;
  if (!datos) {
    return <EstadoVacio mensaje="Elige un corte en Documentos para generar el informe." />;
  }

  const { corte, tablero, ajustes, analisis } = datos;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Informe ejecutivo · {corte.nombre}</h1>
          <p className="mt-1 text-sm text-texto-2">
            {fechaCorta(corte.fechaInicio)} al {fechaCorta(corte.fechaFin)} · {tablero.zonas.length}{" "}
            zonas · {tablero.zonas.reduce((total, zona) => total + zona.tiendas.length, 0)} tiendas
          </p>
        </div>
        <BarraExportar
          pptxHref={`/api/documentos/pptx?tipo=ejecutivo&corte=${corteId}`}
          docxHref={`/api/documentos/docx?tipo=ejecutivo&corte=${corteId}`}
        />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi
          etiqueta="Ventas de la cadena"
          valor={moneda(tablero.total.ventasReal)}
          cumplimiento={tablero.total.cumplimientoVentas}
          detalle={`Meta ${moneda(tablero.total.ventasMeta)}`}
        />
        <TarjetaKpi
          etiqueta="Brecha"
          valor={moneda(tablero.total.brechaVentas)}
          detalle={`${datos.rezagadas.length} tiendas en la cola`}
        />
        <TarjetaKpi
          etiqueta="Margen bruto"
          valor={porcentaje(tablero.total.margenBrutoReal)}
          detalle={moneda(tablero.total.margenBrutoUsd)}
        />
        <TarjetaKpi
          etiqueta="Ajustes"
          valor={moneda(ajustes.total.totalMonto)}
          detalle={`${porcentaje(ajustes.total.totalPorcentaje, 2)} de las ventas`}
        />
      </section>

      {analisis && (
        <section className="tarjeta p-5">
          <h2 className="text-sm font-semibold">Lectura del corte</h2>
          <div className="mt-2 space-y-3 text-sm leading-relaxed text-texto-2">
            {analisis.lecturaGeneral
              .split("\n")
              .filter(Boolean)
              .map((parrafo, indice) => (
                <p key={indice}>{parrafo}</p>
              ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-texto-2">Comparativo por zona</h2>
        <div className="tarjeta overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th className="text-left">Zona</th>
                <th className="text-left">Gerente</th>
                <th className="text-right">Meta</th>
                <th className="text-right">Ventas</th>
                <th className="text-right">Cumpl.</th>
                <th className="text-right">Ticket</th>
                <th className="text-right">%MB</th>
                <th className="text-right">Aporte</th>
              </tr>
            </thead>
            <tbody>
              {tablero.zonas.map((zona) => (
                <tr key={zona.zonaId}>
                  <td className="font-medium">{zona.zona}</td>
                  <td className="text-texto-2">{zona.gerente}</td>
                  <td className="cifra">{moneda(zona.subtotal.ventasMeta)}</td>
                  <td className="cifra">{moneda(zona.subtotal.ventasReal)}</td>
                  <td className="cifra">{porcentaje(zona.subtotal.cumplimientoVentas)}</td>
                  <td className="cifra">{moneda(zona.subtotal.ticketPromedio, true)}</td>
                  <td className="cifra">{porcentaje(zona.subtotal.margenBrutoReal)}</td>
                  <td className="cifra">
                    {porcentaje(
                      tablero.total.ventasReal && zona.subtotal.ventasReal
                        ? (zona.subtotal.ventasReal / tablero.total.ventasReal) * 100
                        : null,
                    )}
                  </td>
                </tr>
              ))}
              <tr className="fila-total">
                <td colSpan={2}>Total cadena</td>
                <td className="cifra">{moneda(tablero.total.ventasMeta)}</td>
                <td className="cifra">{moneda(tablero.total.ventasReal)}</td>
                <td className="cifra">{porcentaje(tablero.total.cumplimientoVentas)}</td>
                <td className="cifra">{moneda(tablero.total.ticketPromedio, true)}</td>
                <td className="cifra">{porcentaje(tablero.total.margenBrutoReal)}</td>
                <td className="cifra">100,0 %</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="tarjeta p-4">
          <h2 className="text-sm font-semibold">Las que sostienen el resultado</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {datos.mejores.map((tienda) => (
              <li key={tienda.tiendaId} className="flex justify-between gap-3">
                <span>
                  {tienda.tienda} <span className="text-xs text-texto-3">{tienda.zona}</span>
                </span>
                <span className="cifra text-exito">{porcentaje(tienda.cumplimientoVentas)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="tarjeta p-4">
          <h2 className="text-sm font-semibold">Las que restan</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {datos.rezagadas.map((tienda) => (
              <li key={tienda.tiendaId} className="flex justify-between gap-3">
                <span>
                  {tienda.tienda} <span className="text-xs text-texto-3">{tienda.zona}</span>
                </span>
                <span className="cifra text-alerta">
                  {porcentaje(tienda.cumplimientoVentas)} · {moneda(tienda.brechaVentas)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-texto-2">Pérdidas por tipología</h2>
        <div className="tarjeta overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th className="text-left">Tipología</th>
                <th className="text-right">Monto</th>
                <th className="text-right">% sobre ventas</th>
              </tr>
            </thead>
            <tbody>
              {TIPOLOGIAS.map((tipologia) => (
                <tr key={tipologia}>
                  <td>{ETIQUETA_TIPOLOGIA[tipologia]}</td>
                  <td className="cifra">{moneda(ajustes.total.montos[tipologia])}</td>
                  <td className="cifra">{porcentaje(ajustes.total.porcentajes[tipologia], 2)}</td>
                </tr>
              ))}
              <tr className="fila-total">
                <td>Total</td>
                <td className="cifra">{moneda(ajustes.total.totalMonto)}</td>
                <td className="cifra">{porcentaje(ajustes.total.totalPorcentaje, 2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {analisis && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-texto-2">Hallazgos y recomendaciones</h2>
          <div className="tarjeta divide-y divide-borde-suave">
            {analisis.hallazgos.map((hallazgo, indice) => (
              <div key={indice} className="px-4 py-3">
                <p className="text-sm font-medium">{hallazgo.titulo}</p>
                <p className="mt-1 text-sm text-texto-2">{hallazgo.evidencia}</p>
              </div>
            ))}
            {analisis.recomendaciones.map((recomendacion, indice) => (
              <div key={`r${indice}`} className="flex justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm">{recomendacion.accion}</p>
                  <p className="mt-0.5 text-xs text-texto-3">{recomendacion.comoMedirlo}</p>
                </div>
                <span className="cifra text-sm font-medium">
                  {moneda(recomendacion.impactoUsd)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {datos.alertas.length > 0 && (
        <section className="tarjeta p-4">
          <h2 className="text-sm font-semibold">Salvedades sobre la data</h2>
          <ul className="mt-2 space-y-1 text-sm text-texto-2">
            {datos.alertas.map((alerta) => (
              <li key={alerta.id}>· {alerta.mensaje}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-texto-3">
            {numero(datos.alertas.length)} inconsistencias abiertas al momento de generar este
            informe.
          </p>
        </section>
      )}
    </div>
  );
}
