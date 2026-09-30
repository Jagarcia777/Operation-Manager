import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { leerCifra, leerCsvVentas, plantillaCsv } from "./csv";

describe("leerCifra", () => {
  it("entiende la cifra como la escribe una hoja en español y en inglés", () => {
    assert.equal(leerCifra("1.234.567,89"), 1234567.89);
    assert.equal(leerCifra("1,234,567.89"), 1234567.89);
    assert.equal(leerCifra("24,94"), 24.94);
    assert.equal(leerCifra("24.94"), 24.94);
    assert.equal(leerCifra("$ 12.000"), 12000);
    assert.equal(leerCifra("24,9 %"), 24.9);
    assert.equal(leerCifra("(1.500)"), -1500);
  });

  it("no toma un decimal chico por separador de miles", () => {
    assert.equal(leerCifra("0.125"), 0.125);
  });

  it("vacío es faltante, no cero; lo ilegible se marca", () => {
    assert.equal(leerCifra(""), null);
    assert.equal(leerCifra("-"), null);
    assert.ok(Number.isNaN(leerCifra("n/d")));
  });
});

describe("leerCsvVentas", () => {
  it("lee la plantilla con punto y coma y decimales con coma", () => {
    const resultado = leerCsvVentas(
      "﻿tienda;ventas_meta;ventas_real;unidades_meta;unidades_real;transacciones_meta;transacciones_real;mb_meta;mb_real\r\n" +
        "Puerto Ordaz;1.200.000;1.150.000,50;;90000;;30000;25;24,5\r\n",
    );
    assert.ok(resultado.ok);
    const [fila] = resultado.lectura.filas;
    assert.equal(fila.tienda, "Puerto Ordaz");
    assert.equal(fila.ventasMeta, 1200000);
    assert.equal(fila.ventasReal, 1150000.5);
    assert.equal(fila.unidadesMeta, null);
    assert.equal(fila.margenBrutoReal, 24.5);
  });

  it("acepta coma como separador y respeta las comillas", () => {
    const resultado = leerCsvVentas('tienda,ventas_real\n"Plaza Mayor, C.C.",1000\n');
    assert.ok(resultado.ok);
    assert.equal(resultado.lectura.filas[0].tienda, "Plaza Mayor, C.C.");
    assert.equal(resultado.lectura.filas[0].ventasReal, 1000);
    // Lo que no trae el archivo se dice, no se rellena.
    assert.match(resultado.lectura.observaciones[0], /ventas_meta/);
  });

  it("separa los subtotales de las tiendas en vez de guardarlos como una", () => {
    const resultado = leerCsvVentas(
      "tienda;ventas_real\nPuerto Ordaz;100\nTotal Zona Oriente;100\n",
    );
    assert.ok(resultado.ok);
    assert.equal(resultado.lectura.filas.length, 1);
    assert.deepEqual(resultado.lectura.subtotalesDeclarados, [
      { etiqueta: "Total Zona Oriente", ventas: 100, unidades: null, transacciones: null },
    ]);
  });

  it("deja en blanco y avisa lo que no es una cifra", () => {
    const resultado = leerCsvVentas("tienda;ventas_real\nPuerto Ordaz;n/d\n");
    assert.ok(resultado.ok);
    assert.equal(resultado.lectura.filas[0].ventasReal, null);
    assert.match(resultado.lectura.observaciones.at(-1)!, /Línea 2/);
  });

  it("rechaza un archivo sin la columna de tienda", () => {
    const resultado = leerCsvVentas("sucursal;ventas_real\nA;1\n");
    assert.equal(resultado.ok, false);
  });

  it("la plantilla se vuelve a leer sin errores", () => {
    const resultado = leerCsvVentas(plantillaCsv(["Puerto Ordaz", "Valle de la Pascua"]));
    assert.ok(resultado.ok);
    assert.equal(resultado.lectura.filas.length, 2);
    assert.equal(resultado.lectura.filas[1].ventasReal, null);
  });
});
