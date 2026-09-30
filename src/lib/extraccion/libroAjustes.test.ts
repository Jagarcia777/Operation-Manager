import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { esLibroAjustes, leerLibroAjustes, periodoDelTitulo, type Hoja } from "./libroAjustes";

/** Una fila con celdas por columna (B = 1). */
const fila = (celdas: Record<string, string | number>) => {
  const salida: (string | number | null)[] = [];
  for (const [letra, valor] of Object.entries(celdas)) salida[letra.charCodeAt(0) - 65] = valor;
  return Array.from(salida, (valor) => valor ?? null);
};

const ENCABEZADO = fila({
  B: "CONCEPTO / SUCURSAL",
  C: "VENTAS USD",
  D: "AJUSTE UNIDADES",
  E: "AJUSTE USD (Costo)",
  F: "% AJ/VTAS",
  H: "TIPOLOGÍA",
  I: "VALOR AJUSTE",
});

/**
 * El libro en miniatura, con la misma disposición que el real: la cadena con una tienda de la
 * zona, un CENDI marcado con ★ y otra sucursal; las tipologías de la cadena; y la sección de
 * la zona, con el encabezado que rotula mal la columna de unidades.
 */
function libro({ totalUnidades = -150 } = {}): Hoja[] {
  return [
    {
      nombre: "AJUSTES VS VENTAS JUNIO 2026",
      filas: [
        fila({ B: "RÍO SUPERMARKET — AJUSTES DE INVENTARIO VS VENTAS | JUNIO 2026  (1ª SEMANA: 01–07 JUN)" }),
        ENCABEZADO,
        fila({ B: "▌  SECCIÓN 1 — CADENA COMPLETA" }),
        fila({ B: "▶ TOTAL CADENA (3 Sucursales)", C: 3000, D: totalUnidades, E: -60, F: -0.05 }),
        fila({ B: "  ★ CENDI TIMOTE", C: "—", D: -80, F: "—" }),
        fila({ B: "  ★ PUERTO ORDAZ", C: 1000, D: -40, E: -30, F: -0.04 }),
        fila({ B: "    LA CANDELARIA", C: 2000, D: -30, F: -0.015 }),
        fila({ B: "  AJUSTES POR TIPOLOGÍA — CADENA COMPLETA" }),
        fila({ B: "  ▶ Merma", E: -50, H: "Merma", I: -35 }),
        fila({ B: "  ▶ Mercadeo", H: "Mercadeo", I: -5 }),
        fila({ B: "  TOTAL AJUSTES CADENA", E: -60, H: "TOTAL", I: 0 }),
        fila({ B: "▌  SECCIÓN 2 — ZONA ORIENTE (1 Sucursal)" }),
        fila({ B: "CONCEPTO / SUCURSAL", C: "VENTAS USD", D: "AJUSTE USD" }),
        fila({ B: "▶ TOTAL ZONA ORIENTE (1 Sucursal)", C: 1000, D: -40, E: -30 }),
        fila({ B: "  ▶ Puerto Ordaz", C: 1000, D: -40, E: -30 }),
        fila({ E: -28, H: "     Merma", I: -38 }),
        fila({ E: -2, H: "     Mercancía dañada", I: -2 }),
        fila({ B: "  AJUSTES POR TIPOLOGÍA — ZONA ORIENTE CONSOLIDADO" }),
        fila({ B: "  ▶ Merma", E: -28, H: "Merma", I: -38 }),
        fila({ B: "LEYENDA DE TIPOLOGÍAS" }),
        fila({ B: "Merma", C: "Pérdida operativa" }),
      ],
    },
    {
      nombre: "CONSOLIDADO CATEGORÍAS",
      filas: [
        fila({ B: "RÍO SUPERMARKET — CONSOLIDADO AJUSTES" }),
        fila({
          B: "CATEGORÍA", C: "VENTAS USD", D: "AJUSTE UNIDADES", E: "AJUSTE USD (Costo)",
          I: "SUCURSAL / CATEGORÍA", J: "VENTAS USD", K: "AJUSTE UNIDADES", L: "AJUSTE USD (Costo)",
        }),
        fila({ B: "TOTAL CADENA", C: 3000, D: -150, E: -60, I: "TOTAL ZONA ORIENTE", J: 1000, K: -40, L: -30 }),
        fila({ B: "  PRODUCTOS DEL CAMPO", C: 400, D: -100, E: -45, I: "▶  PUERTO ORDAZ", J: 1000, K: -40, L: -30 }),
        fila({ B: "  CARNICOS", C: 900, D: -50, E: -15, I: "     PRODUCTOS DEL CAMPO", J: 150, K: -30, L: -25 }),
        fila({ I: "     CARNICOS", J: 300, K: -10, L: -5 }),
        // Nota al pie combinada: el lector de Excel la repite en todas las columnas.
        fila({ B: "Fuente: Dirección de Operaciones", I: "Fuente: Dirección de Operaciones" }),
      ],
    },
  ];
}

describe("periodoDelTitulo", () => {
  it("lee el rango de días del título", () => {
    assert.deepEqual(periodoDelTitulo("JUNIO 2026  (1ª SEMANA: 01–07 JUN)"), {
      desde: "2026-06-01",
      hasta: "2026-06-07",
    });
  });

  it("sin rango toma el mes completo", () => {
    assert.deepEqual(periodoDelTitulo("AJUSTES | FEBRERO 2028"), {
      desde: "2028-02-01",
      hasta: "2028-02-29",
    });
  });
});

describe("leerLibroAjustes", () => {
  it("reconoce el libro por su título", () => {
    assert.ok(esLibroAjustes(libro()));
    assert.equal(esLibroAjustes([{ nombre: "x", filas: [fila({ A: "Otra cosa" })] }]), false);
  });

  it("lee la cadena, los centros de distribución y la tienda de la zona", () => {
    const lectura = leerLibroAjustes(libro());
    assert.deepEqual(lectura.cadena, { ventas: 3000, unidades: -150, monto: -60 });
    const cendi = lectura.sucursales.find((sucursal) => sucursal.nombre === "CENDI TIMOTE");
    assert.equal(cendi?.esCentro, true);
    assert.equal(cendi?.deLaZona, true);
    assert.equal(cendi?.ventas, null);

    // La columna rotulada "AJUSTE USD" en la sección 2 trae unidades: se usa el encabezado bueno.
    const [tienda] = lectura.tiendas;
    assert.deepEqual(
      { nombre: tienda.nombre, ventas: tienda.ventas, unidades: tienda.unidades, monto: tienda.monto },
      { nombre: "Puerto Ordaz", ventas: 1000, unidades: -40, monto: -30 },
    );
    assert.deepEqual(tienda.tipologias[1], {
      etiqueta: "Mercancía dañada",
      tipologia: "MERCANCIA_DANADA",
      unidades: -2,
      monto: -2,
    });
  });

  it("reconoce las tipologías nuevas de la cadena", () => {
    const lectura = leerLibroAjustes(libro());
    assert.deepEqual(
      lectura.tipologiasCadena.map((ajuste) => ajuste.tipologia),
      ["MERMA", "MERCADEO"],
    );
  });

  it("lee el ajuste por categoría de la cadena y de cada tienda", () => {
    const lectura = leerLibroAjustes(libro());
    assert.equal(lectura.categoriasCadena.length, 2);
    assert.equal(lectura.categoriasTiendas[0].categorias.length, 2);
    assert.deepEqual(lectura.categoriasTiendas[0].categorias[0], {
      categoria: "PRODUCTOS DEL CAMPO",
      ventas: 150,
      unidades: -30,
      monto: -25,
    });
  });

  it("dice que el % del libro divide unidades entre dólares", () => {
    const hallazgo = leerLibroAjustes(libro()).observaciones.find(
      (observacion) => observacion.indicador === "PCT_AJUSTE_LIBRO",
    );
    assert.match(hallazgo!.mensaje, /da -5,00 % para la cadena cuando en dólares es -2,00 %/);
  });

  it("marca el total de unidades que no cuadra con su detalle", () => {
    const indicadores = (lectura: ReturnType<typeof leerLibroAjustes>) =>
      lectura.observaciones.map((observacion) => observacion.indicador);
    // −80 − 40 − 30 = −150: cuadra.
    assert.ok(!indicadores(leerLibroAjustes(libro())).includes("UNIDADES_CADENA_LIBRO"));
    assert.ok(
      indicadores(leerLibroAjustes(libro({ totalUnidades: -100 }))).includes("UNIDADES_CADENA_LIBRO"),
    );
  });

  it("no inventa descuadres cuando las tipologías suman el total de la tienda", () => {
    const indicadores = leerLibroAjustes(libro()).observaciones.map((o) => o.indicador);
    assert.ok(!indicadores.some((indicador) => indicador.startsWith("MONTO_TIPOLOGIAS")));
    assert.ok(!indicadores.some((indicador) => indicador.startsWith("UNIDADES_TIPOLOGIAS")));
  });
});
