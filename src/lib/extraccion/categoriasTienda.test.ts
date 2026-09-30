import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  agruparBajoCosto,
  conciliarPorcentajes,
  esProblemaDeCadena,
  esReporteCategoriasTienda,
  leerCategoriasTienda,
  leerMagnitud,
  mismoProducto,
  type ItemTexto,
} from "./categoriasTienda";

/**
 * Un reporte en miniatura con la misma disposición que el PDF real de Power BI: filtros
 * arriba, la lista de productos bajo costo y la tabla de categorías, cada visual en bloque y
 * con las cifras alineadas a la derecha de su encabezado. Incluye los íconos del tablero, que
 * el lector debe ignorar.
 */
function reporte({
  filtroCategoria = "Todas",
  bajoCosto = [
    ["PUERTO ORDAZ", "15814", "COSTILLA RES"],
    ["PUERTO ORDAZ", "15823", "LAGARTO CON HUESO"],
  ],
  filas = [
    ["CARNICOS", "336.766", "21,14%", "46.813", "22,72"],
    ["CUIDADO PERSONAL", "57.131", "4,11%", "15.717", "28,43"],
  ],
  total = ["393.897", "100,00%", "62.530", "23,57"],
}: {
  filtroCategoria?: string;
  bajoCosto?: string[][];
  filas?: string[][];
  total?: string[];
} = {}): ItemTexto[] {
  const items: ItemTexto[] = [
    { texto: "sucursal", x: 655, y: 1066 },
    { texto: "PUERTO O…", x: 658, y: 1044 },
    { texto: "", x: 717, y: 1043 },
    // El top: nombres a la izquierda, etiquetas de barra a la derecha y marcas del eje debajo.
    { texto: "TOP 20 Productos de mayor venta", x: 457, y: 778 },
    { texto: "0 mil", x: 591, y: 584 },
    { texto: "100 mil", x: 812, y: 584 },
    { texto: "Ventas USD", x: 728, y: 572 },
    { texto: "Producto", x: 466, y: 659 },
    { texto: "CARNE DE PRIMERA.", x: 525, y: 750 },
    { texto: "COSTILLA RES", x: 545, y: 734 },
    { texto: "LECHE EN POLVO COMPLETA CA…", x: 484, y: 718 },
    { texto: "135 mil", x: 605, y: 750 },
    { texto: "8 mil", x: 605, y: 734 },
    { texto: "13 …", x: 605, y: 718 },
    { texto: "Productos vendidos con costo mayor o igual al PVP", x: 457, y: 989 },
    { texto: "Sucursal", x: 461, y: 971 },
    { texto: "barra", x: 539, y: 971 },
    { texto: "Producto", x: 621, y: 971 },
    { texto: "Costo U", x: 901, y: 971 },
  ];
  bajoCosto.forEach(([sucursal, codigo, producto], i) => {
    const y = 955 - i * 12;
    items.push(
      { texto: sucursal, x: 461, y },
      { texto: codigo, x: 539, y },
      { texto: producto, x: 621, y },
      { texto: "7,", x: 917, y },
    );
  });
  items.push(
    { texto: "Total", x: 461, y: 955 - bajoCosto.length * 12 },
    { texto: "Fecha", x: 767, y: 1067 },
    { texto: "01/09/2026", x: 774, y: 1046 },
    { texto: "13/09/2026", x: 854, y: 1046 },
    { texto: "Categoria", x: 436, y: 1066 },
    { texto: filtroCategoria, x: 438, y: 1044 },
    { texto: "Procedencia", x: 545, y: 1066 },
    { texto: "Todas", x: 547, y: 1044 },
    { texto: "VENTAS POR CATEGORIA", x: 127, y: 1062 },
    { texto: "Categoria", x: 10, y: 1037 },
    { texto: "Ventas USD", x: 508, y: 1037 },
    { texto: "% Venta", x: 631, y: 1037 },
    { texto: "", x: 631, y: 1031 },
    { texto: "Unidades", x: 742, y: 1037 },
    { texto: "Margen (%)", x: 848, y: 1037 },
  );
  [...filas, ["Total", ...total]].forEach(([nombre, ventas, pct, unidades, margen], i) => {
    const y = 1021 - i * 12;
    items.push(
      { texto: nombre, x: 10, y },
      { texto: ventas, x: 590, y },
      { texto: pct, x: 704, y },
      { texto: unidades, x: 812, y },
      { texto: margen, x: 925, y },
    );
  });
  return items;
}

describe("leerCategoriasTienda", () => {
  it("reconoce el reporte y no lo confunde con otro documento", () => {
    assert.ok(esReporteCategoriasTienda(reporte()));
    assert.equal(esReporteCategoriasTienda([{ texto: "RESUMEN EJECUTIVO", x: 0, y: 0 }]), false);
  });

  it("lee cada categoría con sus cifras en la columna correcta", () => {
    const lectura = leerCategoriasTienda(reporte());
    assert.deepEqual(lectura.categorias[0], {
      categoria: "CARNICOS",
      ventas: 336766,
      porcentajeImpreso: 21.14,
      unidades: 46813,
      margen: 22.72,
    });
    assert.deepEqual(lectura.total, { ventas: 393897, unidades: 62530, margen: 23.57 });
    assert.equal(lectura.desde, "2026-09-01");
    assert.equal(lectura.hasta, "2026-09-13");
    assert.deepEqual(lectura.observaciones, []);
  });

  it("toma el nombre completo de la sucursal y no el filtro cortado", () => {
    assert.equal(leerCategoriasTienda(reporte()).sucursal, "PUERTO ORDAZ");
    // Sin productos bajo costo solo queda el filtro, sin los puntos suspensivos.
    assert.equal(leerCategoriasTienda(reporte({ bajoCosto: [] })).sucursal, "PUERTO O");
  });

  it("lee los productos bajo costo sin la columna de costo cortada", () => {
    assert.deepEqual(leerCategoriasTienda(reporte()).bajoCosto, [
      { sucursal: "PUERTO ORDAZ", codigo: "15814", producto: "COSTILLA RES" },
      { sucursal: "PUERTO ORDAZ", codigo: "15823", producto: "LAGARTO CON HUESO" },
    ]);
  });

  it("avisa cuando la lista bajo costo llena la pantalla y puede seguir", () => {
    const doce = Array.from({ length: 12 }, (_, i) => ["PUERTO ORDAZ", String(i), `P${i}`]);
    const lectura = leerCategoriasTienda(reporte({ bajoCosto: doce }));
    assert.equal(lectura.bajoCosto.length, 12);
    assert.match(lectura.observaciones.join(" "), /puede haber más/);
  });

  it("avisa si el reporte está filtrado y no es toda la tienda", () => {
    const lectura = leerCategoriasTienda(reporte({ filtroCategoria: "CARNICOS" }));
    assert.match(lectura.observaciones.join(" "), /filtrado por categoria = «CARNICOS»/);
  });

  it("avisa cuando las filas no suman el total impreso", () => {
    const lectura = leerCategoriasTienda(reporte({ total: ["500.000", "100,00%", "1", "20"] }));
    assert.match(lectura.observaciones.join(" "), /falta o sobra una fila/);
  });
});

describe("conciliarPorcentajes", () => {
  it("dice una vez que el % impreso usa otra base y nombra el patrón", () => {
    const lectura = leerCategoriasTienda(reporte());
    const alerta = conciliarPorcentajes(lectura, "Puerto Ordaz");
    assert.ok(alerta);
    assert.equal(alerta.tiendaId, null);
    assert.equal(alerta.indicador, "PCT_VENTA_CATEGORIA");
    // 336.766 / 393.897 = 85,50 %: el impreso 21,14 % queda muy por debajo.
    assert.match(alerta.mensaje, /por debajo en CARNICOS 21,14 % contra 85,50 %/);
  });

  it("no dice nada cuando el impreso es la venta entre el total", () => {
    const lectura = leerCategoriasTienda(
      reporte({
        filas: [
          ["A", "750", "75,00%", "1", "20"],
          ["B", "250", "25,00%", "1", "20"],
        ],
        total: ["1.000", "100,00%", "2", "20"],
      }),
    );
    assert.equal(conciliarPorcentajes(lectura, "X"), null);
  });
});

describe("productos bajo costo en varias tiendas", () => {
  it("agrupa por código y ordena por cuántas tiendas lo venden bajo costo", () => {
    const grupos = agruparBajoCosto([
      { codigo: "1", producto: "PEPINO", tienda: "Puerto Ordaz" },
      { codigo: "2", producto: "COSTILLA RES", tienda: "Puerto Ordaz" },
      { codigo: "2", producto: "COSTILLA RES", tienda: "Tipuro" },
      { codigo: "2", producto: "COSTILLA RES", tienda: "Tipuro" },
    ]);
    assert.deepEqual(grupos[0], {
      codigo: "2",
      producto: "COSTILLA RES",
      tiendas: ["Puerto Ordaz", "Tipuro"],
    });
  });

  it("una o dos tiendas son casos de tienda; desde tres, precio de cadena", () => {
    assert.equal(esProblemaDeCadena(1), false);
    assert.equal(esProblemaDeCadena(2), false);
    assert.equal(esProblemaDeCadena(3), true);
  });
});

describe("datosDelCorte", () => {
  it("cae en el mismo acumulado que crea el Resumen Ejecutivo", async () => {
    const { datosDelCorte } = await import("./guardarCategorias");
    assert.deepEqual(datosDelCorte("2026-09-01", "2026-09-13"), {
      nombre: "Acumulado al 13/09/2026",
      tipo: "ACUMULADO_MES",
      diasTranscurridos: 13,
    });
    assert.equal(datosDelCorte("2026-09-13", "2026-09-13").nombre, "13/09/2026");
    assert.deepEqual(datosDelCorte("2026-09-07", "2026-09-13"), {
      nombre: "Del 07/09 al 13/09/2026",
      tipo: "SEMANAL",
      diasTranscurridos: 7,
    });
  });
});

describe("top de productos de la tienda", () => {
  it("lee el top en orden, sin las marcas del eje", () => {
    assert.deepEqual(leerCategoriasTienda(reporte()).topProductos, [
      { posicion: 1, producto: "CARNE DE PRIMERA.", ventasAprox: 135000 },
      { posicion: 2, producto: "COSTILLA RES", ventasAprox: 8000 },
      { posicion: 3, producto: "LECHE EN POLVO COMPLETA CA…", ventasAprox: null },
    ]);
  });

  it("lee las etiquetas redondeadas y no adivina las cortadas", () => {
    assert.equal(leerMagnitud("135 mil"), 135000);
    assert.equal(leerMagnitud("2 mill."), 2000000);
    assert.equal(leerMagnitud("1,5 mill."), 1500000);
    assert.equal(leerMagnitud("13 …"), null);
  });

  it("casa un nombre cortado del top con el nombre completo", () => {
    assert.ok(mismoProducto("LECHE EN POLVO COMPLETA CA…", "LECHE EN POLVO COMPLETA CAMPIÑA 862G"));
    assert.ok(mismoProducto("COSTILLA RES", "Costilla res"));
    assert.equal(mismoProducto("COSTILLA RES", "COSTILLA RES AHUMADA"), false);
  });
});
