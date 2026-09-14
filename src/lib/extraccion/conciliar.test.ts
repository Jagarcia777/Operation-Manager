import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { conciliarIndicadores, type Conciliacion } from "./conciliar";

const conciliacion = (
  valores: [string, number | null, number | null][],
): Conciliacion => ({
  clave: "ticketPromedio",
  etiqueta: "Ticket promedio",
  formula: "ventas ÷ transacciones",
  valores: valores.map(([tienda, impreso, derivado], indice) => ({
    tiendaId: `t${indice}`,
    tienda,
    impreso,
    derivado,
  })),
});

describe("conciliarIndicadores", () => {
  it("calla cuando lo impreso y lo derivado coinciden", () => {
    const alertas = conciliarIndicadores([
      conciliacion([
        ["Puerto Ordaz", 45.2, 45.2],
        ["Plaza Mayor", 44.83, 44.9],
      ]),
    ]);
    assert.equal(alertas.length, 0);
  });

  it("tolera el redondeo con el que el informe publica sus cifras", () => {
    // 15,5 impreso contra 15,55 derivado es la misma cifra con un decimal.
    const alertas = conciliarIndicadores([conciliacion([["Lomas del Sol", 15.5, 15.55]])]);
    assert.equal(alertas.length, 0);
  });

  it("una sucursal descuadrada se señala por su nombre", () => {
    const alertas = conciliarIndicadores([
      conciliacion([
        ["Puerto Ordaz", 45.2, 45.2],
        ["Plaza Mayor", 44.83, 44.9],
        ["Tipuro", 49.32, 30.1],
        ["Puente Real", 30.98, 31.0],
      ]),
    ]);
    assert.equal(alertas.length, 1);
    assert.equal(alertas[0].severidad, "BAJA");
    assert.equal(alertas[0].tiendaId, "t2");
    assert.match(alertas[0].mensaje, /Tipuro/);
  });

  it("un sesgo parejo en toda la cadena se dice una sola vez", () => {
    // El caso real: TKTPROM queda ~6 % por encima de ventas ÷ transacciones en todas.
    const alertas = conciliarIndicadores([
      conciliacion([
        ["Lomas del Sol", 60.44, 56.09],
        ["Plaza Mayor", 44.83, 41.89],
        ["Puerto Ordaz", 45.2, 42.56],
        ["La Candelaria", 37.78, 35.39],
      ]),
    ]);
    assert.equal(alertas.length, 1);
    assert.equal(alertas[0].severidad, "MEDIA");
    assert.equal(alertas[0].tiendaId, null);
    assert.match(alertas[0].mensaje, /4 de 4 sucursales/);
    // La mediana de los desvíos, no el peor caso ni el promedio.
    assert.ok(alertas[0].valorObservado! > 6 && alertas[0].valorObservado! < 7);
  });

  it("no compara lo que no tiene con qué compararse", () => {
    const alertas = conciliarIndicadores([
      conciliacion([
        ["Sin impreso", null, 40],
        ["Sin derivado", 40, null],
        // Una sucursal cerrada: cero transacciones no es un desacuerdo, es una división que
        // no se puede hacer.
        ["Cerrada", 0, 0],
      ]),
    ]);
    assert.equal(alertas.length, 0);
  });
});

describe("precisión con la que el informe publica cada cifra", () => {
  const precio = (valores: [string, number, number][]) => ({
    clave: "precioPromedio",
    etiqueta: "Precio promedio por unidad",
    formula: "ventas ÷ unidades",
    valores: valores.map(([tienda, impreso, derivado], indice) => ({
      tiendaId: `t${indice}`,
      tienda,
      impreso,
      derivado,
    })),
  });

  it("no delata la coma que el informe no imprimió", () => {
    // El informe publica el precio promedio con un decimal: 3,05 sale impreso como 3,1 y
    // 2,95 como 2,9. En porcentaje eso es 1,7 %, pero cabe entero dentro del redondeo.
    const alertas = conciliarIndicadores([
      precio([
        ["Playa El Ángel", 3.1, 3.05],
        ["El Recreo", 2.9, 2.95],
      ]),
    ]);
    assert.equal(alertas.length, 0);
  });

  it("un desacuerdo mayor que el redondeo sí se levanta", () => {
    const alertas = conciliarIndicadores([precio([["Tipuro", 3.4, 2.9]])]);
    assert.equal(alertas.length, 1);
  });

  it("con dos decimales el margen de redondeo es mucho más estrecho", () => {
    const alertas = conciliarIndicadores([
      {
        clave: "ticketPromedio",
        etiqueta: "Ticket promedio",
        formula: "ventas ÷ transacciones",
        valores: [
          { tiendaId: "t0", tienda: "Lomas del Sol", impreso: 60.44, derivado: 56.09 },
        ],
      },
    ]);
    assert.equal(alertas.length, 1);
  });
});
