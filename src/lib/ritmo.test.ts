import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compararDias, perfilSemanal, resumirRitmo, type PuntoDiario } from "./ritmo";

/** La serie real del informe del 12/09/2026, del más viejo al más reciente. */
const SERIE: PuntoDiario[] = [
  ["2026-08-29", 1939667],
  ["2026-08-30", 1774924],
  ["2026-08-31", 1462034],
  ["2026-09-01", 1728719],
  ["2026-09-02", 1635333],
  ["2026-09-03", 1402771],
  ["2026-09-04", 1465086],
  ["2026-09-05", 1917679],
  ["2026-09-06", 1760247],
  ["2026-09-07", 1354895],
  ["2026-09-08", 1189508],
  ["2026-09-09", 1232376],
  ["2026-09-10", 1209411],
  ["2026-09-11", 1341979],
  ["2026-09-12", 1874760],
].map(([fecha, ventas]) => ({ fecha: new Date(`${fecha}T00:00:00Z`), ventas: ventas as number }));

describe("compararDias", () => {
  it("reconstruye los dos comparativos que imprime el informe", () => {
    const dias = compararDias(SERIE);
    const sabado = dias[0];
    assert.equal(sabado.diaSemana, "sábado");
    assert.equal(sabado.ventas, 1874760);
    // Contra el día anterior: +39,70 % según el informe.
    assert.equal(sabado.anterior, 1341979);
    assert.equal(Number(sabado.variacionAnterior!.toFixed(2)), 39.7);
    // Contra el mismo sábado de la semana pasada: -2,24 % según el informe.
    assert.equal(sabado.semanaAnterior, 1917679);
    assert.equal(Number(sabado.variacionSemanal!.toFixed(2)), -2.24);
  });

  it("cada día cae en su día de la semana", () => {
    const dias = compararDias(SERIE);
    assert.deepEqual(
      dias.map((dia) => dia.diaSemana),
      ["sábado", "viernes", "jueves", "miércoles", "martes", "lunes", "domingo"],
    );
  });

  it("sin referencia no inventa una variación de cero", () => {
    const cortada = SERIE.slice(-3);
    const dias = compararDias(cortada);
    const masViejo = dias.at(-1)!;
    assert.equal(masViejo.anterior, null);
    assert.equal(masViejo.variacionAnterior, null);
    assert.equal(masViejo.semanaAnterior, null);
    assert.equal(masViejo.variacionSemanal, null);
  });
});

describe("resumirRitmo", () => {
  it("compara semana contra semana y no día contra día", () => {
    const resumen = resumirRitmo(SERIE);
    // 06/09 al 12/09 contra 30/08 al 05/09: la caída real de la cadena, sin el ruido del
    // calendario que hace que un sábado siempre parezca mejor que un martes.
    assert.equal(Math.round(resumen.promedio!), 1423311);
    assert.equal(Math.round(resumen.promedioSemanaAnterior!), 1626649);
    assert.equal(Number(resumen.variacionSemanal!.toFixed(1)), -12.5);
  });

  it("señala el mejor y el peor día de la semana", () => {
    const resumen = resumirRitmo(SERIE);
    assert.equal(resumen.mejor!.ventas, 1874760);
    assert.equal(resumen.peor!.ventas, 1189508);
  });

  it("no compara contra una semana anterior incompleta", () => {
    const resumen = resumirRitmo(SERIE.slice(-9));
    assert.notEqual(resumen.promedio, null);
    assert.equal(resumen.promedioSemanaAnterior, null);
    assert.equal(resumen.variacionSemanal, null);
  });
});

describe("perfilSemanal", () => {
  /** Tres semanas idénticas: el sábado vende el doble que el resto. */
  const serieTipica = (ultimoSabado: number): PuntoDiario[] =>
    Array.from({ length: 21 }, (_, dia) => {
      const fecha = new Date(Date.UTC(2026, 8, 6 + dia)); // del domingo 6 al sábado 26
      const esUltimo = dia === 20;
      const base = fecha.getUTCDay() === 6 ? 2000 : 1000;
      return { fecha, ventas: esUltimo ? ultimoSabado : base };
    });

  it("reparte la semana típica y ordena de lunes a domingo", () => {
    const perfil = perfilSemanal(serieTipica(2000))!;
    assert.equal(perfil.dias[0].diaSemana, "lunes");
    assert.equal(perfil.dias[6].diaSemana, "domingo");
    const sabado = perfil.dias[5];
    assert.equal(sabado.diaSemana, "sábado");
    assert.equal(sabado.pesoSemana, 25); // 2000 de 8000
    assert.equal(sabado.indiceSemana, 175); // 2000 contra un día típico de 8000 / 7
    const total = perfil.dias.reduce((suma, dia) => suma + dia.pesoSemana!, 0);
    assert.ok(Math.abs(total - 100) < 1e-9);
  });

  it("juzga el último día contra su promedio sin incluirse en él", () => {
    const perfil = perfilSemanal(serieTipica(1500))!;
    const sabado = perfil.dias[5];
    assert.equal(sabado.promedio, 2000);
    assert.equal(sabado.ultimo?.ventas, 1500);
    assert.equal(sabado.ultimo?.variacion, -25);
  });

  it("con una sola semana no hay perfil", () => {
    assert.equal(perfilSemanal(serieTipica(2000).slice(-7)), null);
    assert.equal(perfilSemanal([]), null);
  });

  it("funciona con la serie real del informe", () => {
    const perfil = perfilSemanal(SERIE);
    assert.ok(perfil);
    // Quince días: el sábado aparece tres veces y el resto dos, así que todos tienen promedio.
    assert.ok(perfil.dias.every((dia) => dia.observaciones >= 1));
  });
});
