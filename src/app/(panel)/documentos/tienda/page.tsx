import { BarraExportar } from "@/components/BarraExportar";
import { EstadoVacio } from "@/components/EstadoVacio";
import { Kpi, Seccion } from "@/components/SeccionInforme";
import { analizarCategorias, consolidarCategorias } from "@/lib/categorias";
import { datosPresentacionTienda } from "@/lib/documentos/datos";
import {
  AMPLITUD_ESCENARIO,
  CLASE_SEMAFORO,
  CLASE_VIABILIDAD,
  ETIQUETA_PERSPECTIVA,
  ETIQUETA_SEMAFORO,
  ETIQUETA_VIABILIDAD,
  PERSPECTIVAS_BSC,
  asp,
  balancedScorecard,
  diagnosticar,
  escenariosCierre,
  ritmoDiario,
  semaforo,
} from "@/lib/documentos/indicadores";
import { ETIQUETA_BCG } from "@/lib/dominio";
import { fechaCorta, moneda, numero, porcentaje, variacion } from "@/lib/formato";

const MESES = [1, 2, 3];

export default async function PresentacionTiendaPage({
  searchParams,
}: PageProps<"/documentos/tienda">) {
  const parametros = await searchParams;
  const corteId = typeof parametros.corte === "string" ? parametros.corte : "";
  const tiendaId = typeof parametros.tienda === "string" ? parametros.tienda : "";

  const datos = corteId && tiendaId ? await datosPresentacionTienda(corteId, tiendaId) : null;
  if (!datos) {
    return (
      <EstadoVacio mensaje="Elige un corte y una tienda en Documentos para generar la presentación." />
    );
  }

  const { fila, tienda, corte, totalCadena } = datos;
  const zona = datos.subtotalZona;
  if (!zona) return <EstadoVacio mensaje="La tienda no tiene una zona asignada." />;

  const consulta = `corte=${corteId}&tienda=${tiendaId}`;
  const escenario = escenariosCierre(fila, corte);
  const mezcla = analizarCategorias(consolidarCategorias(datos.categorias));
  const lectura = diagnosticar(tienda.nombre, fila, zona, datos.margenMinimo);
  const bsc = balancedScorecard(fila, zona, {
    ajustesPct: datos.ajusteTotal,
    ajustesPctReferencia: null,
  });

  // Los cortes son acumulados: la comparación válida entre ellos es la venta por día.
  const ritmo = ritmoDiario(fila.ventasReal, corte.diasTranscurridos);
  const ritmoPrevio = ritmoDiario(
    datos.filaAnterior?.ventasReal ?? null,
    datos.corteAnterior?.diasTranscurridos,
  );
  const variacionRitmo =
    ritmo !== null && ritmoPrevio ? ((ritmo - ritmoPrevio) / ritmoPrevio) * 100 : null;

  const ritmoZona = ritmoDiario(zona.ventasReal, corte.diasTranscurridos);
  const ritmoZonaPrevio = ritmoDiario(
    datos.zonaAnterior?.subtotal.ventasReal ?? null,
    datos.corteAnterior?.diasTranscurridos,
  );
  const variacionZona =
    ritmoZona !== null && ritmoZonaPrevio
      ? ((ritmoZona - ritmoZonaPrevio) / ritmoZonaPrevio) * 100
      : null;

  const valorBenchmark = (clave: string) =>
    datos.benchmarks.find((benchmark) => benchmark.clave === clave)?.valor ?? null;

  const indicadores = [
    {
      indicador: "Logro contra meta",
      tienda: fila.cumplimientoVentas,
      zona: zona.cumplimientoVentas,
      cadena: totalCadena.cumplimientoVentas,
      benchmark: 100,
      formato: "PORCENTAJE" as const,
      mejorEsMayor: true,
    },
    {
      indicador: "Margen bruto",
      tienda: fila.margenBrutoReal,
      zona: zona.margenBrutoReal,
      cadena: totalCadena.margenBrutoReal,
      benchmark: valorBenchmark("MB_PCT"),
      formato: "PORCENTAJE" as const,
      mejorEsMayor: true,
    },
    {
      indicador: "RPT (ticket promedio)",
      tienda: fila.ticketPromedio,
      zona: zona.ticketPromedio,
      cadena: totalCadena.ticketPromedio,
      benchmark: valorBenchmark("RPT"),
      formato: "MONEDA" as const,
      mejorEsMayor: true,
    },
    {
      indicador: "UPT",
      tienda: fila.upt,
      zona: zona.upt,
      cadena: totalCadena.upt,
      benchmark: valorBenchmark("UPT"),
      formato: "DECIMAL" as const,
      mejorEsMayor: true,
    },
    {
      indicador: "ASP",
      tienda: asp(fila),
      zona: asp(zona),
      cadena: asp(totalCadena),
      benchmark: valorBenchmark("ASP"),
      formato: "MONEDA" as const,
      mejorEsMayor: true,
    },
    {
      indicador: "Ajustes sobre ventas",
      tienda: datos.ajusteTotal,
      zona: null,
      cadena: null,
      benchmark: valorBenchmark("AJUSTES_PCT"),
      formato: "PORCENTAJE" as const,
      mejorEsMayor: false,
    },
  ];

  const posicion = `${datos.posicionZona}.º de ${datos.tiendasEnZona} en ${datos.zona?.zona ?? "su zona"}`;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-texto-3 uppercase">
            Presentación de tienda
          </p>
          <h1 className="mt-1 text-2xl">{tienda.nombre}</h1>
          <p className="mt-1 text-sm text-texto-2">
            {tienda.zona.nombre} · {corte.nombre} · cierre al {fechaCorta(corte.fechaFin)}
          </p>
          <span
            className={`chip mt-2 ${CLASE_SEMAFORO[semaforo(fila.cumplimientoVentas, 100)]}`}
          >
            {posicion}
          </span>
        </div>
        <BarraExportar
          pptxHref={`/api/documentos/pptx?tipo=tienda&${consulta}`}
          docxHref={`/api/documentos/docx?tipo=tienda&${consulta}`}
        />
      </header>

      <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi etiqueta="Ventas" valor={moneda(fila.ventasReal)} pie={`Meta ${moneda(fila.ventasMeta)}`} />
        <Kpi
          etiqueta="Logro"
          valor={porcentaje(fila.cumplimientoVentas)}
          pie={`Zona ${porcentaje(zona.cumplimientoVentas)}`}
        />
        <Kpi etiqueta="Venta por día" valor={moneda(ritmo)} pie={variacion(variacionRitmo)} />
        <Kpi
          etiqueta="RPT"
          valor={moneda(fila.ticketPromedio, true)}
          pie={`Zona ${moneda(zona.ticketPromedio, true)}`}
        />
        <Kpi etiqueta="%MB" valor={porcentaje(fila.margenBrutoReal)} pie={`Zona ${porcentaje(zona.margenBrutoReal)}`} />
        <Kpi etiqueta="UPT" valor={numero(fila.upt, 2)} pie={`Zona ${numero(zona.upt, 2)}`} />
      </section>

      <section className="tarjeta bg-superficie-2 p-5">
        <h2 className="text-sm font-semibold">Síntesis</h2>
        <p className="mt-2 text-sm leading-relaxed text-texto-2">
          {tienda.nombre} cierra con {moneda(fila.ventasReal)}, {porcentaje(fila.cumplimientoVentas)}{" "}
          de su meta, y queda {posicion}. Su brecha contra meta es de {moneda(fila.brechaVentas)}.
          {escenario.base !== null && (
            <> Al ritmo actual cerraría el mes en {moneda(escenario.base)}.</>
          )}
          {escenario.metaSuperada ? (
            <>
              {" "}
              Ya cubrió la meta del período con lo acumulado; lo que venda en los días restantes
              se suma por encima.
            </>
          ) : (
            escenario.viabilidad && (
              <>
                {" "}
                Llegar a la meta exige {moneda(escenario.ritmoRequerido)} diarios frente a los{" "}
                {moneda(escenario.ritmoActual)} que trae: un cierre{" "}
                {ETIQUETA_VIABILIDAD[escenario.viabilidad].toLowerCase()}.
              </>
            )
          )}
        </p>
      </section>

      <Seccion
        numero={1}
        titulo="Tablero de indicadores"
        descripcion="La tienda contra su zona, contra la cadena y contra la referencia cargada."
      >
        <div className="tarjeta overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th className="text-left">Indicador</th>
                <th className="text-right">{tienda.nombre}</th>
                <th className="text-right">{tienda.zona.nombre}</th>
                <th className="text-right">Cadena</th>
                <th className="text-right">Referencia</th>
                <th className="text-left">Lectura</th>
              </tr>
            </thead>
            <tbody>
              {indicadores.map((entrada) => {
                const formatear = (valor: number | null) =>
                  entrada.formato === "MONEDA"
                    ? moneda(valor, true)
                    : entrada.formato === "PORCENTAJE"
                      ? porcentaje(valor, 2)
                      : numero(valor, 2);
                const tono = semaforo(entrada.tienda, entrada.zona, entrada.mejorEsMayor);
                return (
                  <tr key={entrada.indicador}>
                    <td>{entrada.indicador}</td>
                    <td className="cifra font-medium">{formatear(entrada.tienda)}</td>
                    <td className="cifra text-texto-2">{formatear(entrada.zona)}</td>
                    <td className="cifra text-texto-2">{formatear(entrada.cadena)}</td>
                    <td className="cifra text-texto-3">{formatear(entrada.benchmark)}</td>
                    <td>
                      {entrada.zona !== null && entrada.tienda !== null ? (
                        <span className={`chip ${CLASE_SEMAFORO[tono]}`}>
                          {ETIQUETA_SEMAFORO[tono]}
                        </span>
                      ) : (
                        <span className="text-xs text-texto-3">Sin referencia</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Seccion>

      <Seccion
        numero={2}
        titulo="Diagnóstico"
        descripcion="Qué sostiene el resultado, qué lo frena y dónde se está yendo el margen."
      >
        <div className="grid items-start gap-3 md:grid-cols-2">
          <div className="tarjeta p-4">
            <p className="text-xs font-medium tracking-wide text-exito uppercase">Fortalezas</p>
            <ul className="mt-2 space-y-1.5 text-sm text-texto-2">
              {lectura.fortalezas.map((punto, indice) => (
                <li key={indice}>· {punto}</li>
              ))}
            </ul>
          </div>
          <div className="tarjeta p-4">
            <p className="text-xs font-medium tracking-wide text-alerta uppercase">
              Alertas y riesgos
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-texto-2">
              {lectura.alertas.map((punto, indice) => (
                <li key={indice}>· {punto}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid items-start gap-3 lg:grid-cols-2">
          <div className="tarjeta overflow-x-auto">
            <table className="tabla">
              <thead>
                <tr>
                  <th className="text-left">Tipología</th>
                  <th className="text-right">Monto</th>
                  <th className="text-right">% ventas</th>
                  <th className="text-right">Mediana zona</th>
                </tr>
              </thead>
              <tbody>
                {datos.ajustes.map((ajuste) => {
                  const excede =
                    ajuste.porcentaje !== null &&
                    ajuste.medianaCadena !== null &&
                    Math.abs(ajuste.porcentaje) > Math.abs(ajuste.medianaCadena) * 2;
                  return (
                    <tr key={ajuste.tipologia}>
                      <td>{ajuste.etiqueta}</td>
                      <td className="cifra">{moneda(ajuste.monto)}</td>
                      <td className={`cifra ${excede ? "text-alerta" : ""}`}>
                        {porcentaje(ajuste.porcentaje, 2)}
                      </td>
                      <td className="cifra text-texto-3">
                        {porcentaje(ajuste.medianaCadena, 2)}
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
                </tr>
              </tbody>
            </table>
          </div>

          <div className="tarjeta overflow-x-auto">
            {mezcla.filas.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-texto-3">
                Sin detalle por categoría en este corte.
              </p>
            ) : (
              <table className="tabla">
                <thead>
                  <tr>
                    <th className="text-left">Categoría</th>
                    <th className="text-right">Peso</th>
                    <th className="text-right">%MB</th>
                    <th className="text-left">BCG</th>
                  </tr>
                </thead>
                <tbody>
                  {mezcla.filas.slice(0, 6).map((categoria) => (
                    <tr key={categoria.categoriaId}>
                      <td>{categoria.categoria}</td>
                      <td className="cifra">{porcentaje(categoria.pesoVenta)}</td>
                      <td className="cifra">{porcentaje(categoria.margenBrutoReal)}</td>
                      <td className="text-texto-2">{ETIQUETA_BCG[categoria.claseBcg]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Seccion>

      <Seccion
        numero={3}
        titulo="Evolución"
        descripcion="Venta por día contra el corte anterior, comparada con el movimiento de la zona."
      >
        {datos.corteAnterior ? (
          <div className="tarjeta overflow-x-auto">
            <table className="tabla">
              <thead>
                <tr>
                  <th className="text-left">Unidad</th>
                  <th className="text-right">{datos.corteAnterior.nombre} · por día</th>
                  <th className="text-right">{corte.nombre} · por día</th>
                  <th className="text-right">Variación</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium">{tienda.nombre}</td>
                  <td className="cifra text-texto-2">{moneda(ritmoPrevio)}</td>
                  <td className="cifra">{moneda(ritmo)}</td>
                  <td className={`cifra ${(variacionRitmo ?? 0) >= 0 ? "text-exito" : "text-alerta"}`}>
                    {variacion(variacionRitmo)}
                  </td>
                </tr>
                <tr>
                  <td>{tienda.zona.nombre}</td>
                  <td className="cifra text-texto-2">{moneda(ritmoZonaPrevio)}</td>
                  <td className="cifra">{moneda(ritmoZona)}</td>
                  <td className={`cifra ${(variacionZona ?? 0) >= 0 ? "text-exito" : "text-alerta"}`}>
                    {variacion(variacionZona)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <EstadoVacio mensaje="No hay un corte anterior comparable cargado." />
        )}
      </Seccion>

      <Seccion
        numero={4}
        titulo="Balanced Scorecard"
        descripcion="La tienda contra su zona en las cuatro perspectivas."
      >
        <div className="tarjeta overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th className="text-left">Perspectiva</th>
                <th className="text-left">Indicador</th>
                <th className="text-right">Tienda</th>
                <th className="text-right">Referencia</th>
                <th className="text-left">Semáforo</th>
              </tr>
            </thead>
            <tbody>
              {PERSPECTIVAS_BSC.flatMap((perspectiva) =>
                bsc
                  .filter((entrada) => entrada.perspectiva === perspectiva)
                  .map((entrada, indice) => {
                    const formatear = (valor: number | null) =>
                      entrada.formato === "MONEDA"
                        ? moneda(valor, true)
                        : entrada.formato === "PORCENTAJE"
                          ? porcentaje(valor, 2)
                          : entrada.formato === "DECIMAL"
                            ? numero(valor, 2)
                            : numero(valor);
                    const tono = semaforo(entrada.valor, entrada.referencia, entrada.mejorEsMayor);
                    return (
                      <tr key={`${perspectiva}-${entrada.indicador}`}>
                        <td className="text-texto-3">
                          {indice === 0 ? ETIQUETA_PERSPECTIVA[perspectiva] : ""}
                        </td>
                        <td>
                          {entrada.indicador}
                          {entrada.nota && (
                            <span className="block text-xs text-texto-3">{entrada.nota}</span>
                          )}
                        </td>
                        <td className="cifra">{formatear(entrada.valor)}</td>
                        <td className="cifra text-texto-2">{formatear(entrada.referencia)}</td>
                        <td>
                          {entrada.valor === null || entrada.referencia === null ? (
                            <span className="text-xs text-texto-3">Sin dato</span>
                          ) : (
                            <span className={`chip ${CLASE_SEMAFORO[tono]}`}>
                              {ETIQUETA_SEMAFORO[tono]}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }),
              )}
            </tbody>
          </table>
        </div>
      </Seccion>

      <Seccion
        numero={5}
        titulo="Proyección de cierre"
        descripcion={`Escenarios al ritmo actual, con una amplitud de ${porcentaje(AMPLITUD_ESCENARIO * 100, 0)} sobre el escenario base.`}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { etiqueta: "Conservador", valor: escenario.conservador },
            { etiqueta: "Base", valor: escenario.base },
            { etiqueta: "Optimista", valor: escenario.optimista },
          ].map((entrada) => (
            <div key={entrada.etiqueta} className="tarjeta px-4 py-3 text-center">
              <p className="text-xs text-texto-3">{entrada.etiqueta}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{moneda(entrada.valor)}</p>
            </div>
          ))}
        </div>

        <div className="tarjeta overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th className="text-left">Concepto</th>
                <th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Meta del período</td>
                <td className="cifra">{moneda(escenario.meta)}</td>
              </tr>
              <tr>
                <td>Acumulado a la fecha</td>
                <td className="cifra">{moneda(escenario.acumulado)}</td>
              </tr>
              <tr>
                <td>Días restantes</td>
                <td className="cifra">{numero(escenario.diasRestantes)}</td>
              </tr>
              <tr>
                <td>Ritmo actual por día</td>
                <td className="cifra">{moneda(escenario.ritmoActual)}</td>
              </tr>
              <tr>
                <td>
                  Ritmo requerido por día
                  {escenario.metaSuperada && (
                    <span className="block text-xs text-texto-3">
                      La meta ya está cubierta con lo acumulado.
                    </span>
                  )}
                </td>
                <td className="cifra font-medium">{moneda(escenario.ritmoRequerido)}</td>
              </tr>
              <tr className="fila-total">
                <td>Exigencia del cierre</td>
                <td className="cifra">
                  {escenario.viabilidad ? (
                    <span className={`chip ${CLASE_VIABILIDAD[escenario.viabilidad]}`}>
                      {ETIQUETA_VIABILIDAD[escenario.viabilidad]}
                      {escenario.exigencia !== null && ` · ${numero(escenario.exigencia, 2)}x`}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Seccion>

      <Seccion
        numero={6}
        titulo="Plan de acción"
        descripcion="Lo comprometido para esta tienda, con sus metas y su cronograma."
      >
        {datos.planes.length === 0 ? (
          <EstadoVacio mensaje="Esta tienda no tiene un plan de acción abierto. Créalo desde Planes de acción." />
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
                <table className="tabla mt-3">
                  <thead>
                    <tr>
                      <th className="text-left">Meta</th>
                      <th className="text-right">Hoy</th>
                      <th className="text-right">Objetivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.metas.map((meta) => (
                      <tr key={meta.id}>
                        <td>{meta.indicador}</td>
                        <td className="cifra">{numero(meta.valorActual, 2)}</td>
                        <td className="cifra font-medium">{numero(meta.valorObjetivo, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {plan.hitos.length > 0 && (
                <div className="mt-3 grid gap-3 border-t border-borde-suave pt-3 sm:grid-cols-3">
                  {MESES.map((mes) => (
                    <div key={mes}>
                      <p className="text-xs font-medium text-texto-3">Mes {mes}</p>
                      <ul className="mt-1 space-y-1 text-sm text-texto-2">
                        {plan.hitos
                          .filter((hito) => hito.mes === mes)
                          .map((hito) => (
                            <li key={hito.id}>
                              · {hito.descripcion}
                              {hito.responsable && (
                                <span className="text-texto-3"> — {hito.responsable}</span>
                              )}
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))
        )}

        {datos.recomendaciones.length > 0 && (
          <div className="tarjeta p-4">
            <p className="text-sm font-semibold">Recomendaciones del análisis para esta tienda</p>
            <ul className="mt-2 space-y-2 text-sm text-texto-2">
              {datos.recomendaciones.map((recomendacion, indice) => (
                <li key={indice}>
                  · {recomendacion.accion}
                  <span className="block text-xs text-texto-3">
                    {moneda(recomendacion.impactoUsd)} · {recomendacion.comoMedirlo}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Seccion>

      <Seccion numero={7} titulo="Conclusiones">
        {datos.hallazgos.length === 0 ? (
          <EstadoVacio mensaje="El análisis del corte no registró hallazgos específicos de esta tienda." />
        ) : (
          <div className="space-y-2">
            {datos.hallazgos.map((hallazgo, indice) => (
              <article key={indice} className="tarjeta p-4">
                <p className="text-sm font-semibold">{hallazgo.titulo}</p>
                <p className="mt-1 text-sm text-texto-2">{hallazgo.evidencia}</p>
                <p className="mt-1 text-sm text-texto-2">
                  <span className="font-medium text-texto">Causa probable. </span>
                  {hallazgo.causaProbable}
                </p>
              </article>
            ))}
          </div>
        )}
      </Seccion>
    </div>
  );
}
