import "server-only";

import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import PptxGenJS from "pptxgenjs";
import { analizarCategorias, consolidarCategorias } from "@/lib/categorias";
import { ETIQUETA_BCG, ETIQUETA_TIPOLOGIA, TIPOLOGIAS } from "@/lib/dominio";
import { moneda, numero, porcentaje, variacion } from "@/lib/formato";
import type { DatosInforme, DatosPresentacion } from "./datos";
import { ETIQUETA_VIABILIDAD, escenariosCierre } from "./indicadores";

const TINTA = "1D1D1F";
const GRIS = "6E6E73";

function nuevaPresentacion(titulo: string) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.title = titulo;
  return pptx;
}

function portada(pptx: PptxGenJS, titulo: string, subtitulo: string) {
  const slide = pptx.addSlide();
  slide.addText(titulo, {
    x: 0.7,
    y: 2.2,
    w: 8.6,
    fontSize: 40,
    bold: true,
    color: TINTA,
  });
  slide.addText(subtitulo, { x: 0.7, y: 3.2, w: 8.6, fontSize: 16, color: GRIS });
}

function laminaIndicadores(
  pptx: PptxGenJS,
  titulo: string,
  indicadores: { etiqueta: string; valor: string; detalle?: string }[],
) {
  const slide = pptx.addSlide();
  slide.addText(titulo, { x: 0.6, y: 0.5, w: 9, fontSize: 24, bold: true, color: TINTA });

  indicadores.forEach((indicador, indice) => {
    const x = 0.6 + (indice % 4) * 2.25;
    const y = 1.6 + Math.floor(indice / 4) * 2;
    slide.addText(indicador.etiqueta.toUpperCase(), {
      x,
      y,
      w: 2.1,
      fontSize: 10,
      color: GRIS,
    });
    slide.addText(indicador.valor, {
      x,
      y: y + 0.35,
      w: 2.1,
      fontSize: 24,
      bold: true,
      color: TINTA,
    });
    if (indicador.detalle) {
      slide.addText(indicador.detalle, { x, y: y + 1, w: 2.1, fontSize: 10, color: GRIS });
    }
  });
}

function laminaTabla(pptx: PptxGenJS, titulo: string, filas: string[][]) {
  const slide = pptx.addSlide();
  slide.addText(titulo, { x: 0.6, y: 0.5, w: 9, fontSize: 24, bold: true, color: TINTA });
  slide.addTable(
    filas.map((fila, indice) =>
      fila.map((celda) => ({
        text: celda,
        options: {
          bold: indice === 0,
          color: indice === 0 ? GRIS : TINTA,
          fontSize: 11,
        },
      })),
    ),
    { x: 0.6, y: 1.4, w: 8.8, border: { type: "solid", color: "E8E8ED", pt: 1 } },
  );
}

function laminaLista(pptx: PptxGenJS, titulo: string, puntos: string[]) {
  const slide = pptx.addSlide();
  slide.addText(titulo, { x: 0.6, y: 0.5, w: 9, fontSize: 24, bold: true, color: TINTA });
  slide.addText(
    puntos.map((punto) => ({ text: punto, options: { bullet: true, breakLine: true } })),
    { x: 0.7, y: 1.5, w: 8.6, h: 3.5, fontSize: 13, color: TINTA },
  );
}

async function aBuffer(pptx: PptxGenJS): Promise<Buffer> {
  const salida = await pptx.write({ outputType: "nodebuffer" });
  return salida as Buffer;
}

export async function pptxPresentacionTienda(datos: DatosPresentacion): Promise<Buffer> {
  const { fila, tienda, corte, totalCadena } = datos;
  const pptx = nuevaPresentacion(`${tienda.nombre} · ${corte.nombre}`);

  portada(pptx, tienda.nombre, `${tienda.zona.nombre} · ${corte.nombre}`);

  laminaIndicadores(pptx, "Resultado del corte", [
    {
      etiqueta: "Ventas",
      valor: moneda(fila.ventasReal),
      detalle: `Meta ${moneda(fila.ventasMeta)}`,
    },
    {
      etiqueta: "Cumplimiento",
      valor: porcentaje(fila.cumplimientoVentas),
      detalle: `Brecha ${moneda(fila.brechaVentas)}`,
    },
    {
      etiqueta: "Ticket promedio",
      valor: moneda(fila.ticketPromedio, true),
      detalle: `Cadena ${moneda(totalCadena.ticketPromedio, true)}`,
    },
    {
      etiqueta: "Margen bruto",
      valor: porcentaje(fila.margenBrutoReal),
      detalle: `Cadena ${porcentaje(totalCadena.margenBrutoReal)}`,
    },
  ]);

  laminaLista(pptx, "Dónde está parada", [
    `Posición ${datos.posicionCadena} de ${datos.totalTiendas} en la cadena`,
    `Posición ${datos.posicionZona} de ${datos.tiendasEnZona} en ${tienda.zona.nombre}`,
    `Variación contra ${datos.corteAnterior?.nombre ?? "el corte anterior"}: ${variacion(datos.variacionVentas)}`,
    `Unidades por transacción: ${numero(fila.upt, 2)}`,
  ]);

  laminaTabla(pptx, "Dónde se pierde dinero", [
    ["Tipología", "Monto", "% ventas", "Mediana cadena"],
    ...datos.ajustes.map((ajuste) => [
      ajuste.etiqueta,
      moneda(ajuste.monto),
      porcentaje(ajuste.porcentaje, 2),
      porcentaje(ajuste.medianaCadena, 2),
    ]),
  ]);

  for (const plan of datos.planes) {
    laminaLista(pptx, plan.titulo, [
      plan.diagnostico ?? "Sin diagnóstico registrado.",
      `Oportunidad: ${moneda(plan.oportunidadUsd)}`,
      ...plan.metas.map(
        (meta) =>
          `${meta.indicador}: ${numero(meta.valorActual, 2)} → ${numero(meta.valorObjetivo, 2)}`,
      ),
      ...plan.hitos.map((hito) => `Mes ${hito.mes}: ${hito.descripcion}`),
    ]);
  }

  return aBuffer(pptx);
}

export async function pptxInformeEjecutivo(datos: DatosInforme): Promise<Buffer> {
  const { corte, tablero, analisis, zonaPropia } = datos;
  if (!zonaPropia) throw new Error("No hay una zona gestionada al detalle.");

  const zona = zonaPropia.subtotal;
  const cadena = tablero.total;
  const pptx = nuevaPresentacion(`${zonaPropia.zona} · ${corte.nombre}`);

  portada(pptx, zonaPropia.zona, `Informe ejecutivo · ${corte.nombre}`);

  laminaIndicadores(pptx, "Resultado del corte", [
    { etiqueta: "Ventas", valor: moneda(zona.ventasReal), detalle: `Meta ${moneda(zona.ventasMeta)}` },
    {
      etiqueta: "Logro",
      valor: porcentaje(zona.cumplimientoVentas),
      detalle: `Cadena ${porcentaje(cadena.cumplimientoVentas)}`,
    },
    {
      etiqueta: "RPT",
      valor: moneda(zona.ticketPromedio, true),
      detalle: `Cadena ${moneda(cadena.ticketPromedio, true)}`,
    },
    { etiqueta: "UPT", valor: numero(zona.upt, 2), detalle: `Cadena ${numero(cadena.upt, 2)}` },
    {
      etiqueta: "%MB",
      valor: porcentaje(zona.margenBrutoReal),
      detalle: `Cadena ${porcentaje(cadena.margenBrutoReal)}`,
    },
    {
      etiqueta: "Ajustes",
      valor: porcentaje(datos.ajustesZona?.subtotal.totalPorcentaje ?? null, 2),
      detalle: moneda(datos.ajustesZona?.subtotal.totalMonto ?? null),
    },
  ]);

  laminaTabla(pptx, "Scorecard por tienda", [
    ["Tienda", "Ventas", "Logro", "Brecha", "RPT", "%MB"],
    ...zonaPropia.tiendas.map((tienda) => [
      tienda.tienda,
      moneda(tienda.ventasReal),
      porcentaje(tienda.cumplimientoVentas),
      moneda(tienda.brechaVentas),
      moneda(tienda.ticketPromedio, true),
      porcentaje(tienda.margenBrutoReal),
    ]),
    [
      zonaPropia.zona,
      moneda(zona.ventasReal),
      porcentaje(zona.cumplimientoVentas),
      moneda(zona.brechaVentas),
      moneda(zona.ticketPromedio, true),
      porcentaje(zona.margenBrutoReal),
    ],
  ]);

  const mezcla = analizarCategorias(consolidarCategorias(datos.categorias));
  if (mezcla.filas.length) {
    laminaTabla(pptx, "Categorías: Pareto y BCG", [
      ["Categoría", "Venta", "Peso", "%MB", "BCG"],
      ...mezcla.filas
        .slice(0, 8)
        .map((fila) => [
          fila.categoria,
          moneda(fila.ventasReal),
          porcentaje(fila.pesoVenta),
          porcentaje(fila.margenBrutoReal),
          ETIQUETA_BCG[fila.claseBcg],
        ]),
    ]);
  }

  laminaTabla(pptx, "Proyección de cierre", [
    ["Tienda", "Meta", "Conservador", "Base", "Optimista", "Viabilidad"],
    ...zonaPropia.tiendas.map((tienda) => {
      const escenario = escenariosCierre(tienda, corte);
      return [
        tienda.tienda,
        moneda(escenario.meta),
        moneda(escenario.conservador),
        moneda(escenario.base),
        moneda(escenario.optimista),
        escenario.viabilidad ? ETIQUETA_VIABILIDAD[escenario.viabilidad] : "—",
      ];
    }),
  ]);

  laminaTabla(pptx, "Ajustes por tipología", [
    ["Tipología", "Monto", "% sobre ventas"],
    ...TIPOLOGIAS.map((tipologia) => [
      ETIQUETA_TIPOLOGIA[tipologia],
      moneda(datos.ajustesZona?.subtotal.montos[tipologia] ?? null),
      porcentaje(datos.ajustesZona?.subtotal.porcentajes[tipologia] ?? null, 2),
    ]),
  ]);

  if (analisis) {
    laminaLista(
      pptx,
      "Hallazgos",
      analisis.hallazgos.map((hallazgo) => `${hallazgo.titulo} — ${hallazgo.evidencia}`),
    );
    laminaTabla(pptx, "Recomendaciones", [
      ["Acción", "Ámbito", "Oportunidad", "Plazo"],
      ...analisis.recomendaciones.map((recomendacion) => [
        recomendacion.accion,
        recomendacion.ambito,
        moneda(recomendacion.impactoUsd),
        recomendacion.plazo,
      ]),
    ]);
  }

  if (datos.alertas.length) {
    laminaLista(
      pptx,
      "Salvedades sobre la data",
      datos.alertas.map((alerta) => alerta.mensaje),
    );
  }

  return aBuffer(pptx);
}

function parrafo(texto: string, opciones?: { negrita?: boolean; gris?: boolean }) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: texto,
        bold: opciones?.negrita,
        color: opciones?.gris ? GRIS : TINTA,
      }),
    ],
  });
}

function tablaDocx(filas: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: filas.map(
      (fila, indice) =>
        new TableRow({
          children: fila.map(
            (celda) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: celda,
                        bold: indice === 0,
                        color: indice === 0 ? GRIS : TINTA,
                        size: 20,
                      }),
                    ],
                  }),
                ],
              }),
          ),
        }),
    ),
  });
}

async function documentoABuffer(secciones: (Paragraph | Table)[]) {
  const documento = new Document({ sections: [{ children: secciones }] });
  return Packer.toBuffer(documento);
}

export async function docxPresentacionTienda(datos: DatosPresentacion): Promise<Buffer> {
  const { fila, tienda, corte, totalCadena } = datos;

  const contenido: (Paragraph | Table)[] = [
    new Paragraph({ text: tienda.nombre, heading: HeadingLevel.HEADING_1 }),
    parrafo(`${tienda.zona.nombre} · ${corte.nombre}`, { gris: true }),

    new Paragraph({ text: "Resultado del corte", heading: HeadingLevel.HEADING_2 }),
    tablaDocx([
      ["Indicador", "Real", "Meta", "Cumplimiento"],
      [
        "Ventas",
        moneda(fila.ventasReal),
        moneda(fila.ventasMeta),
        porcentaje(fila.cumplimientoVentas),
      ],
      [
        "Transacciones",
        numero(fila.transaccionesReal),
        numero(fila.transaccionesMeta),
        porcentaje(fila.cumplimientoTransacciones),
      ],
      ["Ticket promedio", moneda(fila.ticketPromedio, true), moneda(fila.ticketMeta, true), "—"],
      ["Margen bruto", porcentaje(fila.margenBrutoReal), porcentaje(fila.margenBrutoMeta), "—"],
    ]),

    new Paragraph({ text: "Dónde está parada", heading: HeadingLevel.HEADING_2 }),
    parrafo(
      `Ocupa la posición ${datos.posicionCadena} de ${datos.totalTiendas} en la cadena y la ${datos.posicionZona} de ${datos.tiendasEnZona} en su zona. Contra ${datos.corteAnterior?.nombre ?? "el corte anterior"} varía ${variacion(datos.variacionVentas)}. La cadena cerró en ${porcentaje(totalCadena.cumplimientoVentas)} de su meta.`,
    ),

    new Paragraph({ text: "Dónde se pierde dinero", heading: HeadingLevel.HEADING_2 }),
    tablaDocx([
      ["Tipología", "Monto", "% ventas", "Mediana cadena"],
      ...datos.ajustes.map((ajuste) => [
        ajuste.etiqueta,
        moneda(ajuste.monto),
        porcentaje(ajuste.porcentaje, 2),
        porcentaje(ajuste.medianaCadena, 2),
      ]),
    ]),
  ];

  for (const plan of datos.planes) {
    contenido.push(new Paragraph({ text: plan.titulo, heading: HeadingLevel.HEADING_2 }));
    contenido.push(parrafo(plan.diagnostico ?? "Sin diagnóstico registrado."));
    contenido.push(parrafo(`Oportunidad estimada: ${moneda(plan.oportunidadUsd)}`, { negrita: true }));
    if (plan.metas.length) {
      contenido.push(
        tablaDocx([
          ["Meta", "Hoy", "Objetivo"],
          ...plan.metas.map((meta) => [
            meta.indicador,
            numero(meta.valorActual, 2),
            numero(meta.valorObjetivo, 2),
          ]),
        ]),
      );
    }
    for (const hito of plan.hitos) {
      contenido.push(parrafo(`Mes ${hito.mes}: ${hito.descripcion}`));
    }
  }

  return documentoABuffer(contenido);
}

export async function docxInformeEjecutivo(datos: DatosInforme): Promise<Buffer> {
  const { corte, tablero, analisis, zonaPropia } = datos;
  if (!zonaPropia) throw new Error("No hay una zona gestionada al detalle.");

  const zona = zonaPropia.subtotal;
  const cadena = tablero.total;

  const contenido: (Paragraph | Table)[] = [
    new Paragraph({ text: `${zonaPropia.zona} · Informe ejecutivo`, heading: HeadingLevel.HEADING_1 }),
    parrafo(
      `${corte.nombre} · ${zonaPropia.tiendas.length} tiendas · ${zonaPropia.gerente}`,
      { gris: true },
    ),
  ];

  if (analisis) {
    contenido.push(new Paragraph({ text: "Lectura del corte", heading: HeadingLevel.HEADING_2 }));
    for (const bloque of analisis.lecturaGeneral.split("\n").filter(Boolean)) {
      contenido.push(parrafo(bloque));
    }
  }

  contenido.push(
    new Paragraph({ text: "Tablero de indicadores", heading: HeadingLevel.HEADING_2 }),
    tablaDocx([
      ["Indicador", zonaPropia.zona, "Cadena"],
      ["Ventas", moneda(zona.ventasReal), moneda(cadena.ventasReal)],
      [
        "Logro contra meta",
        porcentaje(zona.cumplimientoVentas),
        porcentaje(cadena.cumplimientoVentas),
      ],
      ["Margen bruto", porcentaje(zona.margenBrutoReal), porcentaje(cadena.margenBrutoReal)],
      [
        "RPT (ticket promedio)",
        moneda(zona.ticketPromedio, true),
        moneda(cadena.ticketPromedio, true),
      ],
      ["UPT", numero(zona.upt, 2), numero(cadena.upt, 2)],
      ["Transacciones", numero(zona.transaccionesReal), numero(cadena.transaccionesReal)],
    ]),

    new Paragraph({ text: "Scorecard por tienda", heading: HeadingLevel.HEADING_2 }),
    tablaDocx([
      ["Tienda", "Ventas", "Logro", "Brecha", "RPT", "%MB"],
      ...zonaPropia.tiendas.map((tienda) => [
        tienda.tienda,
        moneda(tienda.ventasReal),
        porcentaje(tienda.cumplimientoVentas),
        moneda(tienda.brechaVentas),
        moneda(tienda.ticketPromedio, true),
        porcentaje(tienda.margenBrutoReal),
      ]),
      [
        zonaPropia.zona,
        moneda(zona.ventasReal),
        porcentaje(zona.cumplimientoVentas),
        moneda(zona.brechaVentas),
        moneda(zona.ticketPromedio, true),
        porcentaje(zona.margenBrutoReal),
      ],
    ]),

    new Paragraph({ text: "Proyección de cierre", heading: HeadingLevel.HEADING_2 }),
    tablaDocx([
      ["Tienda", "Meta", "Conservador", "Base", "Optimista", "Viabilidad"],
      ...zonaPropia.tiendas.map((tienda) => {
        const escenario = escenariosCierre(tienda, corte);
        return [
          tienda.tienda,
          moneda(escenario.meta),
          moneda(escenario.conservador),
          moneda(escenario.base),
          moneda(escenario.optimista),
          escenario.viabilidad ? ETIQUETA_VIABILIDAD[escenario.viabilidad] : "—",
        ];
      }),
    ]),

    new Paragraph({ text: "Ajustes por tipología", heading: HeadingLevel.HEADING_2 }),
    tablaDocx([
      ["Tipología", "Monto", "% sobre ventas"],
      ...TIPOLOGIAS.map((tipologia) => [
        ETIQUETA_TIPOLOGIA[tipologia],
        moneda(datos.ajustesZona?.subtotal.montos[tipologia] ?? null),
        porcentaje(datos.ajustesZona?.subtotal.porcentajes[tipologia] ?? null, 2),
      ]),
    ]),
  );

  const mezcla = analizarCategorias(consolidarCategorias(datos.categorias));
  if (mezcla.filas.length) {
    contenido.push(
      new Paragraph({ text: "Categorías: Pareto y BCG", heading: HeadingLevel.HEADING_2 }),
      tablaDocx([
        ["Categoría", "Venta", "Peso", "%MB", "BCG"],
        ...mezcla.filas
          .slice(0, 10)
          .map((fila) => [
            fila.categoria,
            moneda(fila.ventasReal),
            porcentaje(fila.pesoVenta),
            porcentaje(fila.margenBrutoReal),
            ETIQUETA_BCG[fila.claseBcg],
          ]),
      ]),
    );
  }

  if (analisis) {
    contenido.push(
      new Paragraph({ text: "Hallazgos", heading: HeadingLevel.HEADING_2 }),
      ...analisis.hallazgos.flatMap((hallazgo) => [
        parrafo(hallazgo.titulo, { negrita: true }),
        parrafo(`${hallazgo.evidencia} Causa probable: ${hallazgo.causaProbable}`),
      ]),
      new Paragraph({ text: "Recomendaciones", heading: HeadingLevel.HEADING_2 }),
      tablaDocx([
        ["Acción", "Ámbito", "Oportunidad", "Plazo", "Cómo se mide"],
        ...analisis.recomendaciones.map((recomendacion) => [
          recomendacion.accion,
          recomendacion.ambito,
          moneda(recomendacion.impactoUsd),
          recomendacion.plazo,
          recomendacion.comoMedirlo,
        ]),
      ]),
    );
  }

  if (datos.alertas.length) {
    contenido.push(
      new Paragraph({ text: "Salvedades sobre la data", heading: HeadingLevel.HEADING_2 }),
      ...datos.alertas.map((alerta) => parrafo(alerta.mensaje)),
    );
  }

  return documentoABuffer(contenido);
}
