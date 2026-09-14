import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calcularArea,
  calcularPlantilla,
  costoDeLaHolgura,
  holguraDeHoras,
  leerEficiencia,
  type AreaDefinicion,
  type CapturaPlantilla,
} from "./plantilla";

/** Afirma que el cálculo devolvió un número y lo entrega: null aquí es fallo de la prueba. */
function num(valor: number | null, mensaje = "se esperaba un número"): number {
  assert.notEqual(valor, null, mensaje);
  return valor as number;
}

/** Redondea a `decimales` para comparar sin arrastrar el ruido del punto flotante. */
const redondear = (valor: number | null, decimales: number) =>
  Number(num(valor).toFixed(decimales));

const area = (valores: Partial<AreaDefinicion> = {}): AreaDefinicion => ({
  id: "a1",
  nombre: "Área",
  kpi: "TPLH",
  estandar: 16,
  estandarMin: 12,
  estandarMax: 20,
  usaVentaTienda: false,
  orden: 0,
  ...valores,
});

const captura = (valores: Partial<CapturaPlantilla> = {}): CapturaPlantilla => ({
  areaId: "a1",
  plantillaMeta: null,
  plantillaActiva: null,
  horasProgramadas: null,
  horasTrabajadas: null,
  horasAusentismo: null,
  horasExtra: null,
  ventas: null,
  unidades: null,
  transacciones: null,
  costoNomina: null,
  ...valores,
});

describe("calcularArea", () => {
  it("deriva los tres KPI de productividad y elige el que le toca al área", () => {
    const fila = calcularArea(
      area({ kpi: "TPLH" }),
      captura({ horasTrabajadas: 652, ventas: 78500, transacciones: 9850, unidades: 0 }),
    );
    assert.equal(redondear(fila.splh, 2), 120.4);
    assert.equal(redondear(fila.tplh, 3), 15.107);
    assert.equal(fila.kpiReal, fila.tplh);
    assert.equal(redondear(fila.indice, 4), 0.9442);
  });

  it("no divide entre cero ni convierte un dato faltante en cero", () => {
    const vacia = calcularArea(area(), captura({ horasTrabajadas: 0, transacciones: 100 }));
    assert.equal(vacia.tplh, null);
    assert.equal(vacia.kpiReal, null);
    assert.equal(vacia.indice, null);
    assert.equal(vacia.estado, "SIN_DATOS");
  });

  it("mide las áreas sin volumen por cobertura de plantilla", () => {
    const fila = calcularArea(
      area({ kpi: "COBERTURA", estandar: 100, estandarMin: null, estandarMax: null }),
      captura({ plantillaMeta: 8, plantillaActiva: 6, horasTrabajadas: 300 }),
    );
    assert.equal(fila.cobertura, 75);
    assert.equal(fila.kpiReal, 75);
    assert.equal(fila.indice, 0.75);
    // Sin volumen no hay horas que ganar: no puede entrar en el índice agregado.
    assert.equal(fila.horasGanadas, null);
  });

  it("le presta la venta de la tienda al área que se mide contra el total", () => {
    const fila = calcularArea(
      area({ kpi: "SPLH", usaVentaTienda: true, estandar: 600, estandarMin: 400, estandarMax: 800 }),
      captura({ horasTrabajadas: 160 }),
      96000,
    );
    assert.equal(fila.ventas, 96000);
    assert.equal(fila.splh, 600);
    assert.equal(fila.indice, 1);
    assert.equal(fila.ventaDerivada, true);
  });
});

describe("leerEficiencia", () => {
  it("un KPI dentro del rango de referencia cumple aunque no llegue al punto medio", () => {
    // 13 trans/hora contra referencia 12–20 y punto 16: el índice es 0,81 pero está en rango.
    const fila = calcularArea(area(), captura({ horasTrabajadas: 100, transacciones: 1300 }));
    assert.equal(fila.tplh, 13);
    assert.equal(redondear(fila.indice, 2), 0.81);
    assert.equal(fila.estado, "DENTRO_DEL_RANGO");
  });

  it("sin rango declarado se cae al umbral clásico de 90 %", () => {
    const sinRango = { estandarMin: null, estandarMax: null };
    assert.equal(leerEficiencia(0.95, 15, sinRango), "ACEPTABLE");
    assert.equal(leerEficiencia(0.85, 13, sinRango), "BAJO_ESTANDAR");
    assert.equal(leerEficiencia(1.4, 22, sinRango), "OPTIMO");
    assert.equal(leerEficiencia(null, null, sinRango), "SIN_DATOS");
  });

  it("por debajo del piso del rango sí es desviación", () => {
    assert.equal(leerEficiencia(0.62, 10, { estandarMin: 12, estandarMax: 20 }), "BAJO_ESTANDAR");
  });
});

describe("calcularPlantilla", () => {
  const cajas = area({ id: "cajas", nombre: "Cajas", kpi: "TPLH", estandar: 16, orden: 1 });
  const carniceria = area({
    id: "carne",
    nombre: "Carnicería",
    kpi: "SPLH",
    estandar: 115,
    estandarMin: 80,
    estandarMax: 150,
    orden: 2,
  });

  it("pondera por horas en vez de promediar los índices de cada área", () => {
    // Cajas cumple el estándar con 600 horas; Carnicería lo cumple a medias con 20.
    // El promedio simple daría 0,75; ponderado por horas, la tienda está en 0,99.
    const resumen = calcularPlantilla(
      [cajas, carniceria],
      [
        captura({ areaId: "cajas", horasTrabajadas: 600, transacciones: 9600 }),
        captura({ areaId: "carne", horasTrabajadas: 20, ventas: 1150 }),
      ],
    );
    const promedioSimple = (num(resumen.filas[0].indice) + num(resumen.filas[1].indice)) / 2;
    assert.equal(Number(promedioSimple.toFixed(2)), 0.75);
    assert.equal(resumen.horasGanadas, 610);
    assert.equal(redondear(resumen.indice, 3), 0.984);
  });

  it("suma horas ganadas de áreas con KPI distinto sin mezclar unidades", () => {
    const reposicion = area({ id: "repo", nombre: "Reposición", kpi: "UPLH", estandar: 125, orden: 3 });
    const resumen = calcularPlantilla(
      [cajas, reposicion],
      [
        captura({ areaId: "cajas", horasTrabajadas: 100, transacciones: 1600 }),
        captura({ areaId: "repo", horasTrabajadas: 100, unidades: 12500 }),
      ],
    );
    // 1600/16 = 100 h y 12500/125 = 100 h: ambas ganaron exactamente lo que trabajaron.
    assert.equal(resumen.horasGanadas, 200);
    assert.equal(resumen.indice, 1);
  });

  it("no cuenta dos veces la venta del área que se mide contra el total de la tienda", () => {
    const administracion = area({
      id: "admin",
      nombre: "Administración",
      kpi: "SPLH",
      estandar: 600,
      usaVentaTienda: true,
      orden: 4,
    });
    const resumen = calcularPlantilla(
      [cajas, carniceria, administracion],
      [
        captura({ areaId: "cajas", horasTrabajadas: 600, transacciones: 9600, ventas: 78500 }),
        captura({ areaId: "carne", horasTrabajadas: 200, ventas: 21500 }),
        captura({ areaId: "admin", horasTrabajadas: 160 }),
      ],
    );
    assert.equal(resumen.ventas, 100000);
    const admin = resumen.filas.find((fila) => fila.areaId === "admin");
    assert.ok(admin, "la fila de Administración debe existir");
    assert.equal(admin.ventas, 100000);
    assert.equal(admin.ventaDerivada, true);
  });

  it("deja fuera del índice las horas de las áreas sin volumen medible", () => {
    const limpieza = area({
      id: "limp",
      nombre: "Limpieza",
      kpi: "COBERTURA",
      estandar: 100,
      estandarMin: null,
      estandarMax: null,
      orden: 5,
    });
    const resumen = calcularPlantilla(
      [cajas, limpieza],
      [
        captura({ areaId: "cajas", horasTrabajadas: 100, transacciones: 1600 }),
        captura({ areaId: "limp", horasTrabajadas: 400, plantillaMeta: 4, plantillaActiva: 3 }),
      ],
    );
    // Las 400 horas de limpieza cuentan para el total de horas, pero no para el índice:
    // si entraran al denominador sin poder ganar horas, lo hundirían a 0,20.
    assert.equal(resumen.horasTrabajadas, 500);
    assert.equal(resumen.indice, 1);
    assert.equal(resumen.areasMedidas, 1);
    assert.equal(resumen.areasConDatos, 2);
  });

  it("un área sin capturar no arrastra el agregado", () => {
    const resumen = calcularPlantilla(
      [cajas, carniceria],
      [captura({ areaId: "cajas", horasTrabajadas: 100, transacciones: 1600 })],
    );
    assert.equal(resumen.areasConDatos, 1);
    assert.equal(resumen.indice, 1);
    assert.equal(resumen.filas.length, 2);
    assert.equal(resumen.filas[1].estado, "SIN_DATOS");
  });

  it("deriva cobertura, ausentismo y horas extra sobre el total y no por promedio", () => {
    const resumen = calcularPlantilla(
      [cajas, carniceria],
      [
        captura({
          areaId: "cajas",
          plantillaMeta: 18,
          plantillaActiva: 17,
          horasProgramadas: 680,
          horasTrabajadas: 652,
          horasAusentismo: 28,
          horasExtra: 14,
          transacciones: 9850,
        }),
        captura({
          areaId: "carne",
          plantillaMeta: 2,
          plantillaActiva: 1,
          horasProgramadas: 80,
          horasTrabajadas: 80,
          horasAusentismo: 0,
          horasExtra: 0,
          ventas: 9200,
        }),
      ],
    );
    assert.equal(resumen.plantillaMeta, 20);
    assert.equal(resumen.plantillaActiva, 18);
    assert.equal(resumen.cobertura, 90);
    assert.equal(redondear(resumen.ausentismo, 2), 3.68);
  });
});

describe("holgura", () => {
  it("traduce la brecha de eficiencia a horas y a dinero", () => {
    const cajas = area({ id: "cajas", kpi: "TPLH", estandar: 16, orden: 1 });
    const resumen = calcularPlantilla(
      [cajas],
      [captura({ areaId: "cajas", horasTrabajadas: 800, transacciones: 9600, costoNomina: 8000 })],
    );
    // 9600 transacciones al estándar deberían costar 600 horas; se usaron 800.
    assert.equal(resumen.horasGanadas, 600);
    assert.equal(holguraDeHoras(resumen), 200);
    // El costo por hora del propio corte es 10 $: 200 horas de más son 2.000 $.
    assert.equal(costoDeLaHolgura(resumen), 2000);
  });

  it("no inventa una holgura cuando no hay con qué calcularla", () => {
    const resumen = calcularPlantilla([area()], []);
    assert.equal(holguraDeHoras(resumen), null);
    assert.equal(costoDeLaHolgura(resumen), null);
  });
});
