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
import { ETIQUETA_TIPOLOGIA, TIPOLOGIAS } from "@/lib/dominio";
import { moneda, numero, porcentaje, variacion } from "@/lib/formato";
import type { DatosInforme, DatosPresentacion } from "./datos";

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
  const { corte, tablero, ajustes, analisis } = datos;
  const pptx = nuevaPresentacion(`Informe ejecutivo · ${corte.nombre}`);

  portada(pptx, "Informe ejecutivo", corte.nombre);

  laminaIndicadores(pptx, "Resultado de la cadena", [
    {
      etiqueta: "Ventas",
      valor: moneda(tablero.total.ventasReal),
      detalle: `Meta ${moneda(tablero.total.ventasMeta)}`,
    },
    {
      etiqueta: "Cumplimiento",
      valor: porcentaje(tablero.total.cumplimientoVentas),
      detalle: `Brecha ${moneda(tablero.total.brechaVentas)}`,
    },
    {
      etiqueta: "Margen bruto",
      valor: porcentaje(tablero.total.margenBrutoReal),
      detalle: moneda(tablero.total.margenBrutoUsd),
    },
    {
      etiqueta: "Ajustes",
      valor: moneda(ajustes.total.totalMonto),
      detalle: `${porcentaje(ajustes.total.totalPorcentaje, 2)} de ventas`,
    },
  ]);

  laminaTabla(pptx, "Comparativo por zona", [
    ["Zona", "Meta", "Ventas", "Cumpl.", "%MB"],
    ...tablero.zonas.map((zona) => [
      zona.zona,
      moneda(zona.subtotal.ventasMeta),
      moneda(zona.subtotal.ventasReal),
      porcentaje(zona.subtotal.cumplimientoVentas),
      porcentaje(zona.subtotal.margenBrutoReal),
    ]),
    [
      "Total cadena",
      moneda(tablero.total.ventasMeta),
      moneda(tablero.total.ventasReal),
      porcentaje(tablero.total.cumplimientoVentas),
      porcentaje(tablero.total.margenBrutoReal),
    ],
  ]);

  laminaTabla(pptx, "Pérdidas por tipología", [
    ["Tipología", "Monto", "% sobre ventas"],
    ...TIPOLOGIAS.map((tipologia) => [
      ETIQUETA_TIPOLOGIA[tipologia],
      moneda(ajustes.total.montos[tipologia]),
      porcentaje(ajustes.total.porcentajes[tipologia], 2),
    ]),
  ]);

  laminaLista(pptx, "Las que restan", [
    ...datos.rezagadas.map(
      (tienda) =>
        `${tienda.tienda} (${tienda.zona}): ${porcentaje(tienda.cumplimientoVentas)} · ${moneda(tienda.brechaVentas)}`,
    ),
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
  const { corte, tablero, ajustes, analisis } = datos;

  const contenido: (Paragraph | Table)[] = [
    new Paragraph({ text: `Informe ejecutivo · ${corte.nombre}`, heading: HeadingLevel.HEADING_1 }),
    parrafo(
      `Cierre de ${tablero.zonas.length} zonas y ${tablero.zonas.reduce((total, zona) => total + zona.tiendas.length, 0)} tiendas.`,
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
    new Paragraph({ text: "Comparativo por zona", heading: HeadingLevel.HEADING_2 }),
    tablaDocx([
      ["Zona", "Gerente", "Meta", "Ventas", "Cumpl.", "%MB"],
      ...tablero.zonas.map((zona) => [
        zona.zona,
        zona.gerente,
        moneda(zona.subtotal.ventasMeta),
        moneda(zona.subtotal.ventasReal),
        porcentaje(zona.subtotal.cumplimientoVentas),
        porcentaje(zona.subtotal.margenBrutoReal),
      ]),
      [
        "Total cadena",
        "",
        moneda(tablero.total.ventasMeta),
        moneda(tablero.total.ventasReal),
        porcentaje(tablero.total.cumplimientoVentas),
        porcentaje(tablero.total.margenBrutoReal),
      ],
    ]),

    new Paragraph({ text: "Pérdidas por tipología", heading: HeadingLevel.HEADING_2 }),
    tablaDocx([
      ["Tipología", "Monto", "% sobre ventas"],
      ...TIPOLOGIAS.map((tipologia) => [
        ETIQUETA_TIPOLOGIA[tipologia],
        moneda(ajustes.total.montos[tipologia]),
        porcentaje(ajustes.total.porcentajes[tipologia], 2),
      ]),
    ]),

    new Paragraph({ text: "Tiendas rezagadas", heading: HeadingLevel.HEADING_2 }),
    tablaDocx([
      ["Tienda", "Zona", "Cumplimiento", "Brecha"],
      ...datos.rezagadas.map((tienda) => [
        tienda.tienda,
        tienda.zona,
        porcentaje(tienda.cumplimientoVentas),
        moneda(tienda.brechaVentas),
      ]),
    ]),
  );

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
