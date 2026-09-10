import { BarraExportar } from "@/components/BarraExportar";
import { EstadoVacio } from "@/components/EstadoVacio";
import { Kpi, Seccion } from "@/components/SeccionInforme";
import { analizarCategorias, consolidarCategorias } from "@/lib/categorias";
import { asp } from "@/lib/documentos/indicadores";
import {
  CLASE_SEMAFORO,
  CLASE_VIABILIDAD,
  ETIQUETA_PERSPECTIVA,
  ETIQUETA_SEMAFORO,
  ETIQUETA_VIABILIDAD,
  PERSPECTIVAS_BSC,
  balancedScorecard,
  diagnosticar,
  escenariosCierre,
  ritmoDiario,
  semaforo,
  AMPLITUD_ESCENARIO,
} from "@/lib/documentos/indicadores";
import { datosInformeEjecutivo } from "@/lib/documentos/datos";
import { ETIQUETA_BCG, ETIQUETA_TIPOLOGIA, TIPOLOGIAS } from "@/lib/dominio";
import { fechaCorta, moneda, numero, porcentaje, variacion } from "@/lib/formato";

export default async function InformeEjecutivoPage({
  searchParams,
}: PageProps<"/documentos/ejecutivo">) {
  const parametros = await searchParams;
  const corteId = typeof parametros.corte === "string" ? parametros.corte : "";

  const datos = corteId ? await datosInformeEjecutivo(corteId) : null;
  if (!datos) {
    return <EstadoVacio mensaje="Elige un corte en Documentos para generar el informe." />;
  }

  const { corte, tablero, zonaPropia, analisis, benchmarks } = datos;
  if (!zonaPropia) {
    return (
      <EstadoVacio mensaje="No hay una zona gestionada al detalle. Define tu zona en Configuración → Perfil." />
    );
  }

  const zona = zonaPropia.subtotal;
  const cadena = tablero.total;
  const escenarioZona = escenariosCierre(zona, corte);
  const mezcla = analizarCategorias(consolidarCategorias(datos.categorias));
  const bsc = balancedScorecard(zona, cadena, {
    ajustesPct: datos.ajustesZona?.subtotal.totalPorcentaje ?? null,
    ajustesPctReferencia: datos.ajustes.total.totalPorcentaje,
  });

  // Los cortes son acumulados al día, así que la comparación válida es el ritmo diario:
  // contrastar el acumulado al 23 contra el acumulado al 12 mediría días, no desempeño.
  const ritmoActual = ritmoDiario(zona.ventasReal, corte.diasTranscurridos);
  const ritmoAnterior = ritmoDiario(
    datos.zonaAnterior?.subtotal.ventasReal ?? null,
    datos.corteAnterior?.diasTranscurridos,
  );
  const variacionZona =
    ritmoActual !== null && ritmoAnterior
      ? ((ritmoActual - ritmoAnterior) / ritmoAnterior) * 100
      : null;

  const valorBenchmark = (clave: string) =>
    benchmarks.find((benchmark) => benchmark.clave === clave)?.valor ?? null;

  const indicadores = [
    // Ventas y transacciones son magnitudes de escala: compararlas contra la cadena mide tamaño,
    // no desempeño, así que no llevan semáforo.
    {
      indicador: "Ventas",
      zona: zona.ventasReal,
      cadena: cadena.ventasReal,
      benchmark: null,
      formato: "MONEDA" as const,
      mejorEsMayor: true,
      comparable: false,
    },
    {
      indicador: "Logro contra meta",
      zona: zona.cumplimientoVentas,
      cadena: cadena.cumplimientoVentas,
      benchmark: 100,
      formato: "PORCENTAJE" as const,
      mejorEsMayor: true,
      comparable: true,
    },
    {
      indicador: "Margen bruto",
      zona: zona.margenBrutoReal,
      cadena: cadena.margenBrutoReal,
      benchmark: valorBenchmark("MB_PCT"),
      formato: "PORCENTAJE" as const,
      mejorEsMayor: true,
      comparable: true,
    },
    {
      indicador: "RPT (ticket promedio)",
      zona: zona.ticketPromedio,
      cadena: cadena.ticketPromedio,
      benchmark: valorBenchmark("RPT"),
      formato: "MONEDA" as const,
      mejorEsMayor: true,
      comparable: true,
    },
    {
      indicador: "UPT",
      zona: zona.upt,
      cadena: cadena.upt,
      benchmark: valorBenchmark("UPT"),
      formato: "DECIMAL" as const,
      mejorEsMayor: true,
      comparable: true,
    },
    {
      indicador: "ASP",
      zona: asp(zona),
      cadena: asp(cadena),
      benchmark: valorBenchmark("ASP"),
      formato: "MONEDA" as const,
      mejorEsMayor: true,
      comparable: true,
    },
    {
      indicador: "Transacciones",
      zona: zona.transaccionesReal,
      cadena: cadena.transaccionesReal,
      benchmark: null,
      formato: "NUMERO" as const,
      mejorEsMayor: true,
      comparable: false,
    },
    {
      indicador: "Ajustes sobre ventas",
      zona: datos.ajustesZona?.subtotal.totalPorcentaje ?? null,
      // Solo se cargan ajustes de las tiendas propias: no hay cifra de cadena que comparar.
      cadena: null,
      benchmark: valorBenchmark("AJUSTES_PCT"),
      formato: "PORCENTAJE" as const,
      mejorEsMayor: false,
      comparable: true,
    },
  ];

  const sinBenchmarks = benchmarks.every((benchmark) => benchmark.valor === null);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-texto-3 uppercase">
            Informe ejecutivo
          </p>
          <h1 className="mt-1 text-2xl">{zonaPropia.zona}</h1>
          <p className="mt-1 text-sm text-texto-2">
            {corte.nombre} · {fechaCorta(corte.fechaInicio)} al {fechaCorta(corte.fechaFin)} ·{" "}
            {zonaPropia.tiendas.length} tiendas · {zonaPropia.gerente}
          </p>
        </div>
        <BarraExportar
          pptxHref={`/api/documentos/pptx?tipo=ejecutivo&corte=${corteId}`}
          docxHref={`/api/documentos/docx?tipo=ejecutivo&corte=${corteId}`}
        />
      </header>

      <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi etiqueta="Ventas" valor={moneda(zona.ventasReal)} pie={`Meta ${moneda(zona.ventasMeta)}`} />
        <Kpi
          etiqueta="Logro"
          valor={porcentaje(zona.cumplimientoVentas)}
          pie={`Cadena ${porcentaje(cadena.cumplimientoVentas)}`}
        />
        <Kpi etiqueta="RPT" valor={moneda(zona.ticketPromedio, true)} pie={`Cadena ${moneda(cadena.ticketPromedio, true)}`} />
        <Kpi etiqueta="Transacciones" valor={numero(zona.transaccionesReal)} />
        <Kpi etiqueta="UPT" valor={numero(zona.upt, 2)} pie={`Cadena ${numero(cadena.upt, 2)}`} />
        <Kpi etiqueta="%MB" valor={porcentaje(zona.margenBrutoReal)} pie={`Cadena ${porcentaje(cadena.margenBrutoReal)}`} />
      </section>

      <section className="tarjeta bg-superficie-2 p-5">
        <h2 className="text-sm font-semibold">Síntesis</h2>
        <p className="mt-2 text-sm leading-relaxed text-texto-2">
          {zonaPropia.zona} cierra el corte con {moneda(zona.ventasReal)} en ventas,{" "}
          {porcentaje(zona.cumplimientoVentas)} de su meta, frente a{" "}
          {porcentaje(cadena.cumplimientoVentas)} de la cadena. Aporta{" "}
          {porcentaje(
            cadena.ventasReal && zona.ventasReal ? (zona.ventasReal / cadena.ventasReal) * 100 : null,
          )}{" "}
          del total de la cadena.
          {escenarioZona.base !== null && (
            <>
              {" "}
              Al ritmo actual el mes cerraría en {moneda(escenarioZona.base)}, lo que deja{" "}
              {moneda(escenarioZona.brechaBase)} contra la meta.
            </>
          )}
          {variacionZona !== null && (
            <>
              {" "}
              La venta por día varía {variacion(variacionZona)} contra{" "}
              {datos.corteAnterior?.nombre}.
            </>
          )}
        </p>
      </section>

      <Seccion
        numero={1}
        titulo="Tablero de indicadores"
        descripcion="Resultado de la zona contra la cadena y contra la referencia cargada."
      >
        {sinBenchmarks && (
          <div className="tarjeta bg-atencion-tenue px-4 py-2.5 text-sm text-atencion">
            No hay valores de referencia cargados. Cárgalos en Configuración → Benchmarks para que
            esta columna deje de salir vacía.
          </div>
        )}
        <div className="tarjeta overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th className="text-left">Indicador</th>
                <th className="text-right">{zonaPropia.zona}</th>
                <th className="text-right">Cadena</th>
                <th className="text-right">Diferencial</th>
                <th className="text-right">Referencia</th>
                <th className="text-left">Lectura</th>
              </tr>
            </thead>
            <tbody>
              {indicadores.map((fila) => {
                const formatear = (valor: number | null) =>
                  fila.formato === "MONEDA"
                    ? moneda(valor, true)
                    : fila.formato === "PORCENTAJE"
                      ? porcentaje(valor, 2)
                      : fila.formato === "DECIMAL"
                        ? numero(valor, 2)
                        : numero(valor);
                const diferencial =
                  fila.zona !== null && fila.cadena !== null ? fila.zona - fila.cadena : null;
                const tono = semaforo(fila.zona, fila.cadena, fila.mejorEsMayor);
                return (
                  <tr key={fila.indicador}>
                    <td>{fila.indicador}</td>
                    <td className="cifra font-medium">{formatear(fila.zona)}</td>
                    <td className="cifra text-texto-2">{formatear(fila.cadena)}</td>
                    <td className="cifra">{formatear(diferencial)}</td>
                    <td className="cifra text-texto-3">{formatear(fila.benchmark)}</td>
                    <td>
                      {fila.comparable && fila.zona !== null && fila.cadena !== null ? (
                        <span className={`chip ${CLASE_SEMAFORO[tono]}`}>
                          {ETIQUETA_SEMAFORO[tono]}
                        </span>
                      ) : (
                        <span className="text-xs text-texto-3">
                          {fila.comparable ? "Sin referencia" : "Escala, no desempeño"}
                        </span>
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
        titulo="Scorecard por tienda"
        descripcion="Cada sucursal contra la zona, con su lectura de fortalezas y alertas."
      >
        <div className="tarjeta overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th className="text-left">Tienda</th>
                <th className="text-right">Ventas</th>
                <th className="text-right">Logro</th>
                <th className="text-right">Brecha</th>
                <th className="text-right">RPT</th>
                <th className="text-right">UPT</th>
                <th className="text-right">%MB</th>
                <th className="text-left">Semáforo</th>
              </tr>
            </thead>
            <tbody>
              {zonaPropia.tiendas.map((tienda) => {
                const tono = semaforo(tienda.cumplimientoVentas, 100);
                return (
                  <tr key={tienda.tiendaId}>
                    <td className="font-medium">{tienda.tienda}</td>
                    <td className="cifra">{moneda(tienda.ventasReal)}</td>
                    <td className="cifra">{porcentaje(tienda.cumplimientoVentas)}</td>
                    <td className="cifra">{moneda(tienda.brechaVentas)}</td>
                    <td className="cifra">{moneda(tienda.ticketPromedio, true)}</td>
                    <td className="cifra">{numero(tienda.upt, 2)}</td>
                    <td className="cifra">{porcentaje(tienda.margenBrutoReal)}</td>
                    <td>
                      <span className={`chip ${CLASE_SEMAFORO[tono]}`}>
                        {ETIQUETA_SEMAFORO[tono]}
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr className="fila-total">
                <td>{zonaPropia.zona}</td>
                <td className="cifra">{moneda(zona.ventasReal)}</td>
                <td className="cifra">{porcentaje(zona.cumplimientoVentas)}</td>
                <td className="cifra">{moneda(zona.brechaVentas)}</td>
                <td className="cifra">{moneda(zona.ticketPromedio, true)}</td>
                <td className="cifra">{numero(zona.upt, 2)}</td>
                <td className="cifra">{porcentaje(zona.margenBrutoReal)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {zonaPropia.tiendas.map((tienda) => {
            const lectura = diagnosticar(tienda.tienda, tienda, zona, datos.margenMinimo);
            return (
              <article key={tienda.tiendaId} className="tarjeta p-4">
                <p className="text-sm font-semibold">{tienda.tienda}</p>
                <p className="mt-2 text-xs font-medium tracking-wide text-exito uppercase">
                  Fortalezas
                </p>
                <ul className="mt-1 space-y-1 text-sm text-texto-2">
                  {lectura.fortalezas.map((punto, indice) => (
                    <li key={indice}>· {punto}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs font-medium tracking-wide text-alerta uppercase">
                  Alertas
                </p>
                <ul className="mt-1 space-y-1 text-sm text-texto-2">
                  {lectura.alertas.map((punto, indice) => (
                    <li key={indice}>· {punto}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </Seccion>

      <Seccion
        numero={3}
        titulo="Tendencia"
        descripcion="Venta por día contra el corte anterior. Como ambos cortes son acumulados, comparar los totales mediría días transcurridos y no desempeño."
      >
        {datos.zonaAnterior ? (
          <div className="tarjeta overflow-x-auto">
            <table className="tabla">
              <thead>
                <tr>
                  <th className="text-left">Tienda</th>
                  <th className="text-right">
                    {datos.corteAnterior?.nombre} · por día
                  </th>
                  <th className="text-right">{corte.nombre} · por día</th>
                  <th className="text-right">Variación</th>
                </tr>
              </thead>
              <tbody>
                {zonaPropia.tiendas.map((tienda) => {
                  const previo = datos.zonaAnterior?.tiendas.find(
                    (fila) => fila.tiendaId === tienda.tiendaId,
                  );
                  const ritmoPrevio = ritmoDiario(
                    previo?.ventasReal ?? null,
                    datos.corteAnterior?.diasTranscurridos,
                  );
                  const ritmo = ritmoDiario(tienda.ventasReal, corte.diasTranscurridos);
                  const cambio =
                    ritmo !== null && ritmoPrevio
                      ? ((ritmo - ritmoPrevio) / ritmoPrevio) * 100
                      : null;
                  return (
                    <tr key={tienda.tiendaId}>
                      <td>{tienda.tienda}</td>
                      <td className="cifra text-texto-2">{moneda(ritmoPrevio)}</td>
                      <td className="cifra">{moneda(ritmo)}</td>
                      <td
                        className={`cifra ${(cambio ?? 0) >= 0 ? "text-exito" : "text-alerta"}`}
                      >
                        {variacion(cambio)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="fila-total">
                  <td>{zonaPropia.zona}</td>
                  <td className="cifra">{moneda(ritmoAnterior)}</td>
                  <td className="cifra">{moneda(ritmoActual)}</td>
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
        <p className="text-xs text-texto-3">
          El análisis por día de la semana requiere venta diaria, que hoy no se carga. Con cortes
          consecutivos acumulados se puede derivar; con un solo corte, no.
        </p>
      </Seccion>

      <Seccion
        numero={4}
        titulo="Categorías: Pareto y BCG"
        descripcion={`${mezcla.categoriasVitales} de ${mezcla.filas.length} categorías concentran el 80% de la venta.`}
      >
        {mezcla.filas.length === 0 ? (
          <EstadoVacio mensaje="Este corte no tiene detalle por categoría cargado." />
        ) : (
          <div className="tarjeta overflow-x-auto">
            <table className="tabla">
              <thead>
                <tr>
                  <th className="text-left">Categoría</th>
                  <th className="text-right">Venta</th>
                  <th className="text-right">Peso</th>
                  <th className="text-right">Acumulado</th>
                  <th className="text-right">%MB</th>
                  <th className="text-left">BCG</th>
                </tr>
              </thead>
              <tbody>
                {mezcla.filas.slice(0, 8).map((fila) => (
                  <tr key={fila.categoriaId}>
                    <td className="font-medium">{fila.categoria}</td>
                    <td className="cifra">{moneda(fila.ventasReal)}</td>
                    <td className="cifra">{porcentaje(fila.pesoVenta)}</td>
                    <td className="cifra text-texto-3">{porcentaje(fila.acumulado)}</td>
                    <td className="cifra">{porcentaje(fila.margenBrutoReal)}</td>
                    <td className="text-texto-2">{ETIQUETA_BCG[fila.claseBcg]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>

      <Seccion
        numero={5}
        titulo="Balanced Scorecard"
        descripcion="La zona contra su referencia en las cuatro perspectivas."
      >
        <div className="tarjeta overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th className="text-left">Perspectiva</th>
                <th className="text-left">Indicador</th>
                <th className="text-right">Resultado</th>
                <th className="text-right">Referencia</th>
                <th className="text-left">Semáforo</th>
              </tr>
            </thead>
            <tbody>
              {PERSPECTIVAS_BSC.flatMap((perspectiva) =>
                bsc
                  .filter((fila) => fila.perspectiva === perspectiva)
                  .map((fila, indice) => {
                    const formatear = (valor: number | null) =>
                      fila.formato === "MONEDA"
                        ? moneda(valor, true)
                        : fila.formato === "PORCENTAJE"
                          ? porcentaje(valor, 2)
                          : fila.formato === "DECIMAL"
                            ? numero(valor, 2)
                            : numero(valor);
                    const tono = semaforo(fila.valor, fila.referencia, fila.mejorEsMayor);
                    return (
                      <tr key={`${perspectiva}-${fila.indicador}`}>
                        <td className="text-texto-3">
                          {indice === 0 ? ETIQUETA_PERSPECTIVA[perspectiva] : ""}
                        </td>
                        <td>
                          {fila.indicador}
                          {fila.nota && (
                            <span className="block text-xs text-texto-3">{fila.nota}</span>
                          )}
                        </td>
                        <td className="cifra">{formatear(fila.valor)}</td>
                        <td className="cifra text-texto-2">{formatear(fila.referencia)}</td>
                        <td>
                          {fila.valor === null ? (
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
        numero={6}
        titulo="Proyección de cierre"
        descripcion={`Escenarios al ritmo actual, con una amplitud de ${porcentaje(AMPLITUD_ESCENARIO * 100, 0)} sobre el escenario base.`}
      >
        <div className="tarjeta overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th className="text-left">Tienda</th>
                <th className="text-right">Meta</th>
                <th className="text-right">Conservador</th>
                <th className="text-right">Base</th>
                <th className="text-right">Optimista</th>
                <th className="text-right">Ritmo requerido</th>
                <th className="text-left">Viabilidad</th>
              </tr>
            </thead>
            <tbody>
              {[...zonaPropia.tiendas, null].map((tienda) => {
                const fila = tienda ?? zona;
                const escenario = escenariosCierre(fila, corte);
                return (
                  <tr
                    key={tienda?.tiendaId ?? "zona"}
                    className={tienda ? "" : "fila-total"}
                  >
                    <td className={tienda ? "" : "font-semibold"}>
                      {tienda?.tienda ?? zonaPropia.zona}
                    </td>
                    <td className="cifra">{moneda(escenario.meta)}</td>
                    <td className="cifra text-texto-2">{moneda(escenario.conservador)}</td>
                    <td className="cifra font-medium">{moneda(escenario.base)}</td>
                    <td className="cifra text-texto-2">{moneda(escenario.optimista)}</td>
                    <td className="cifra">{moneda(escenario.ritmoRequerido)}</td>
                    <td>
                      {escenario.viabilidad ? (
                        <span className={`chip ${CLASE_VIABILIDAD[escenario.viabilidad]}`}>
                          {ETIQUETA_VIABILIDAD[escenario.viabilidad]}
                        </span>
                      ) : (
                        <span className="text-xs text-texto-3">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-texto-3">
          Quedan {numero(escenarioZona.diasRestantes)} días del período. El ritmo actual de la zona
          es {moneda(escenarioZona.ritmoActual)} por día y para llegar a meta haría falta{" "}
          {moneda(escenarioZona.ritmoRequerido)} diarios.
        </p>
      </Seccion>

      <Seccion
        numero={7}
        titulo="Ajustes y plan de acción"
        descripcion="Dónde se pierde dinero y qué está comprometido para corregirlo."
      >
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="tarjeta overflow-x-auto">
            <table className="tabla">
              <thead>
                <tr>
                  <th className="text-left">Tipología</th>
                  <th className="text-right">Monto</th>
                  <th className="text-right">% ventas</th>
                </tr>
              </thead>
              <tbody>
                {TIPOLOGIAS.map((tipologia) => (
                  <tr key={tipologia}>
                    <td>{ETIQUETA_TIPOLOGIA[tipologia]}</td>
                    <td className="cifra">
                      {moneda(datos.ajustesZona?.subtotal.montos[tipologia] ?? null)}
                    </td>
                    <td className="cifra">
                      {porcentaje(datos.ajustesZona?.subtotal.porcentajes[tipologia] ?? null, 2)}
                    </td>
                  </tr>
                ))}
                <tr className="fila-total">
                  <td>Total</td>
                  <td className="cifra">{moneda(datos.ajustesZona?.subtotal.totalMonto ?? null)}</td>
                  <td className="cifra">
                    {porcentaje(datos.ajustesZona?.subtotal.totalPorcentaje ?? null, 2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            {datos.planes.length === 0 ? (
              <EstadoVacio mensaje="No hay planes de acción abiertos." />
            ) : (
              datos.planes.slice(0, 4).map((plan) => (
                <article key={plan.id} className="tarjeta p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{plan.titulo}</p>
                    <span className="text-sm font-medium">{moneda(plan.oportunidadUsd)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-texto-3">
                    {plan.tienda?.nombre ?? "Toda la zona"} · {plan.hitos.length} hitos ·{" "}
                    {plan.metas.length} metas
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      </Seccion>

      <Seccion
        numero={8}
        titulo="Conclusiones"
        descripcion="Lectura del corte y salvedades sobre la data."
      >
        {analisis ? (
          <div className="space-y-2">
            {analisis.hallazgos.slice(0, 5).map((hallazgo, indice) => (
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
        ) : (
          <EstadoVacio mensaje="Genera el análisis del corte para que esta sección traiga conclusiones." />
        )}

        {datos.alertas.length > 0 && (
          <div className="tarjeta bg-atencion-tenue p-4">
            <h3 className="text-sm font-semibold text-atencion">Salvedades sobre la data</h3>
            <ul className="mt-2 space-y-1 text-sm text-atencion">
              {datos.alertas.map((alerta) => (
                <li key={alerta.id}>· {alerta.mensaje}</li>
              ))}
            </ul>
          </div>
        )}
      </Seccion>
    </div>
  );
}
