import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planDesdeRecomendacion, resolverAmbito, tituloDePlan } from "./plan";

const ZONAS = [
  { id: "z-oriente", nombre: "Zona Oriente" },
  { id: "z-resto", nombre: "Resto de la cadena" },
];
const TIENDAS = [
  { id: "t-po", nombre: "Puerto Ordaz", codigo: null, alias: "PTO ORDAZ" },
  { id: "t-tip", nombre: "Maturín Tipuro", codigo: null, alias: null },
];

describe("resolverAmbito", () => {
  it("reconoce una tienda por nombre o alias", () => {
    assert.deepEqual(resolverAmbito("Puerto Ordaz", ZONAS, TIENDAS), {
      alcance: "TIENDA",
      zonaId: null,
      tiendaId: "t-po",
    });
    assert.equal(resolverAmbito("PTO. ORDAZ", ZONAS, TIENDAS).tiendaId, "t-po");
  });

  it("reconoce una zona antes que una tienda parecida", () => {
    assert.deepEqual(resolverAmbito("Zona Oriente", ZONAS, TIENDAS), {
      alcance: "ZONA",
      zonaId: "z-oriente",
      tiendaId: null,
    });
  });

  it("acepta una tienda escrita a medias", () => {
    assert.equal(resolverAmbito("Tipuro", ZONAS, TIENDAS).tiendaId, "t-tip");
  });

  it("lo que no reconoce queda como plan de cadena", () => {
    assert.equal(resolverAmbito("Cadena", ZONAS, TIENDAS).alcance, "CADENA");
    assert.equal(resolverAmbito("Todas las tiendas", ZONAS, TIENDAS).alcance, "CADENA");
    assert.equal(resolverAmbito("Categoría Víveres", ZONAS, TIENDAS).alcance, "CADENA");
  });
});

describe("planDesdeRecomendacion", () => {
  const recomendacion = {
    accion: "Reforzar cajas los sábados de 10 a 14 h en Puerto Ordaz",
    ambito: "Puerto Ordaz",
    impactoUsd: null,
    esfuerzo: "BAJO" as const,
    plazo: "90_DIAS" as const,
    comoMedirlo: "Transacciones del sábado ≥ 4.200",
  };

  it("no inventa oportunidad cuando el análisis no la estimó", () => {
    const plan = planDesdeRecomendacion(recomendacion, "Septiembre 2026");
    assert.equal(plan.oportunidadUsd, 0);
    assert.equal(plan.hito.mes, 3);
    assert.equal(plan.meta.indicador, recomendacion.comoMedirlo);
    assert.match(plan.diagnostico, /Septiembre 2026/);
  });

  it("acorta el título sin partir palabras", () => {
    const titulo = tituloDePlan("palabra ".repeat(40));
    assert.ok(titulo.length <= 111);
    assert.ok(titulo.endsWith("palabra…"));
  });
});
