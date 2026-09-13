import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { agregarFilas, aporte, calcularFila, mediana, proyectarCierre } from "./calculos";

const fila = (valores: Partial<Parameters<typeof calcularFila>[0]>) =>
  calcularFila({
    ventasMeta: null,
    ventasReal: null,
    unidadesMeta: null,
    unidadesReal: null,
    transaccionesMeta: null,
    transaccionesReal: null,
    margenBrutoMeta: null,
    margenBrutoReal: null,
    ...valores,
  });

describe("calcularFila", () => {
  it("deriva ticket, UPT y cumplimiento", () => {
    const calculada = fila({
      ventasMeta: 1000,
      ventasReal: 900,
      unidadesReal: 300,
      transaccionesReal: 100,
    });
    assert.equal(calculada.ticketPromedio, 9);
    assert.equal(calculada.upt, 3);
    assert.equal(calculada.cumplimientoVentas, 90);
    assert.equal(calculada.brechaVentas, -100);
  });

  it("no inventa un cero cuando falta el dato", () => {
    const calculada = fila({ ventasReal: 900 });
    assert.equal(calculada.cumplimientoVentas, null, "sin meta no hay cumplimiento");
    assert.equal(calculada.ticketPromedio, null, "sin transacciones no hay ticket");
    assert.equal(calculada.brechaVentas, null, "sin meta no hay brecha");
  });

  it("no divide entre cero", () => {
    const calculada = fila({ ventasMeta: 0, ventasReal: 500, transaccionesReal: 0 });
    assert.equal(calculada.cumplimientoVentas, null);
    assert.equal(calculada.ticketPromedio, null);
  });
});

describe("agregarFilas", () => {
  it("pondera el margen por venta y no lo promedia", () => {
    // Una tienda grande con margen bajo y una pequeña con margen alto. El promedio simple
    // daría 25 %, que es un margen que no existe en ninguna parte.
    const agregada = agregarFilas([
      fila({ ventasReal: 900_000, margenBrutoReal: 20 }),
      fila({ ventasReal: 100_000, margenBrutoReal: 30 }),
    ]);
    assert.equal(agregada.ventasReal, 1_000_000);
    assert.equal(agregada.margenBrutoReal, 21, "20,9 % ponderado, no 25 % promediado");
  });

  it("suma los importes y deriva el ticket del total", () => {
    const agregada = agregarFilas([
      fila({ ventasReal: 600, transaccionesReal: 20 }),
      fila({ ventasReal: 400, transaccionesReal: 80 }),
    ]);
    assert.equal(agregada.ventasReal, 1000);
    assert.equal(agregada.transaccionesReal, 100);
    assert.equal(agregada.ticketPromedio, 10, "1000/100, no el promedio de 30 y 5");
  });

  it("ignora los nulos en vez de contarlos como cero", () => {
    const agregada = agregarFilas([
      fila({ ventasReal: 500, margenBrutoReal: 20 }),
      fila({ ventasReal: null, margenBrutoReal: null }),
    ]);
    assert.equal(agregada.ventasReal, 500);
    assert.equal(agregada.margenBrutoReal, 20, "la tienda sin dato no diluye el margen");
  });

  it("devuelve nulo cuando ninguna fila trae el dato", () => {
    const agregada = agregarFilas([fila({}), fila({})]);
    assert.equal(agregada.ventasReal, null);
    assert.equal(agregada.margenBrutoReal, null);
  });
});

describe("proyectarCierre", () => {
  it("extrapola por días transcurridos", () => {
    assert.equal(proyectarCierre(1_000_000, 10, 30), 3_000_000);
  });

  it("no proyecta sin base de días: prefiere callar a inventar", () => {
    assert.equal(proyectarCierre(1_000_000, null, 30), null);
    assert.equal(proyectarCierre(1_000_000, 10, null), null);
    assert.equal(proyectarCierre(1_000_000, 0, 30), null);
  });
});

describe("aporte", () => {
  it("calcula el peso sobre el total", () => {
    assert.equal(aporte(250, 1000), 25);
  });

  it("devuelve nulo si el total es cero o falta", () => {
    assert.equal(aporte(250, 0), null);
    assert.equal(aporte(250, null), null);
  });
});

describe("mediana", () => {
  it("toma el valor central con impares y el promedio con pares", () => {
    assert.equal(mediana([3, 1, 2]), 2);
    assert.equal(mediana([1, 2, 3, 4]), 2.5);
  });

  it("descarta nulos antes de ordenar", () => {
    assert.equal(mediana([1, null, 3, undefined]), 2);
    assert.equal(mediana([null, undefined]), null);
  });
});
