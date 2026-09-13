import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcularFila } from "@/lib/calculos";
import { asp, escenariosCierre, ritmoDiario, semaforo } from "./indicadores";

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

describe("ritmoDiario", () => {
  it("normaliza por días, que es lo único que hace comparables dos acumulados", () => {
    // El mismo desempeño visto en dos cortes de distinta longitud: el acumulado cambia,
    // el ritmo no. Confundirlos fue el error que inflaba la variación a +90 %.
    assert.equal(ritmoDiario(1_200_000, 12), 100_000);
    assert.equal(ritmoDiario(2_300_000, 23), 100_000);
  });

  it("devuelve nulo sin base de días en vez de asumir una", () => {
    assert.equal(ritmoDiario(1_200_000, null), null);
    assert.equal(ritmoDiario(1_200_000, 0), null);
  });
});

describe("escenariosCierre", () => {
  const corte = { diasTranscurridos: 10, diasDelMes: 30 };

  it("proyecta y abre los escenarios alrededor del ritmo actual", () => {
    const escenario = escenariosCierre(fila({ ventasMeta: 3_000_000, ventasReal: 1_000_000 }), corte);
    assert.equal(escenario.base, 3_000_000);
    assert.ok(escenario.optimista! > escenario.base!);
    assert.ok(escenario.conservador! < escenario.base!);
    assert.equal(escenario.diasRestantes, 20);
    assert.equal(escenario.ritmoActual, 100_000);
  });

  it("no pide ritmo negativo cuando la meta ya está cubierta", () => {
    // Con la meta superada, faltante es negativo: dividirlo entre los días restantes daría
    // "necesitas vender -20.000 al día", que no significa nada.
    const escenario = escenariosCierre(fila({ ventasMeta: 500_000, ventasReal: 900_000 }), corte);
    assert.equal(escenario.metaSuperada, true);
    assert.equal(escenario.ritmoRequerido, 0);
  });

  it("no proyecta sin días del corte", () => {
    const escenario = escenariosCierre(
      fila({ ventasMeta: 3_000_000, ventasReal: 1_000_000 }),
      { diasTranscurridos: null, diasDelMes: null },
    );
    assert.equal(escenario.base, null);
    assert.equal(escenario.ritmoRequerido, null);
  });
});

describe("semaforo", () => {
  it("verde al alcanzar la referencia, rojo al quedarse corto", () => {
    assert.equal(semaforo(22, 22), "VERDE");
    assert.equal(semaforo(25, 22), "VERDE");
    assert.equal(semaforo(21.2, 22), "AMBAR");
    assert.equal(semaforo(15, 22), "ROJO");
  });

  it("invierte el criterio donde menos es mejor", () => {
    assert.equal(semaforo(0.8, 1.0, false), "VERDE", "menos merma que la referencia");
    assert.equal(semaforo(2.0, 1.0, false), "ROJO");
  });

  it("sin referencia no pinta verde: queda en ámbar", () => {
    assert.equal(semaforo(22, null), "AMBAR");
    assert.equal(semaforo(null, 22), "AMBAR");
  });
});

describe("asp", () => {
  it("es venta entre unidades, no entre transacciones", () => {
    assert.equal(asp(fila({ ventasReal: 1000, unidadesReal: 100, transaccionesReal: 40 })), 10);
  });

  it("devuelve nulo sin unidades", () => {
    assert.equal(asp(fila({ ventasReal: 1000 })), null);
  });
});
