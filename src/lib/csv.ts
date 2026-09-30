import type { ExtraccionVentasTipo } from "@/lib/extraccion/esquemas";

// Importación CSV con plantilla fija: el respaldo para cuando el número llega en una hoja de
// cálculo y no en un documento que leer. El resultado tiene la misma forma que la lectura con
// IA, así pasa por la misma pantalla de revisión: un CSV tampoco se guarda sin que alguien lo
// mire, porque una columna corrida en Excel es tan fácil como una celda mal leída.

export const COLUMNAS_CSV = [
  { clave: "tienda", encabezado: "tienda" },
  { clave: "ventasMeta", encabezado: "ventas_meta" },
  { clave: "ventasReal", encabezado: "ventas_real" },
  { clave: "unidadesMeta", encabezado: "unidades_meta" },
  { clave: "unidadesReal", encabezado: "unidades_real" },
  { clave: "transaccionesMeta", encabezado: "transacciones_meta" },
  { clave: "transaccionesReal", encabezado: "transacciones_real" },
  { clave: "margenBrutoMeta", encabezado: "mb_meta" },
  { clave: "margenBrutoReal", encabezado: "mb_real" },
] as const;

type ClaveNumerica = Exclude<(typeof COLUMNAS_CSV)[number]["clave"], "tienda">;

/** Tope de filas: la cadena tiene 25 sucursales; mil filas ya es un archivo equivocado. */
export const MAXIMO_FILAS_CSV = 1000;

/** El Excel en español guarda con punto y coma; el resto del mundo, con coma. Se acepta ambos. */
function detectarSeparador(primeraLinea: string) {
  const puntoYComa = primeraLinea.split(";").length;
  const coma = primeraLinea.split(",").length;
  return puntoYComa > coma ? ";" : ",";
}

/** Separa una línea respetando comillas dobles ("Plaza Mayor, C.C." es una sola celda). */
function partirLinea(linea: string, separador: string): string[] {
  const celdas: string[] = [];
  let actual = "";
  let entreComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const caracter = linea[i];
    if (entreComillas) {
      if (caracter === '"' && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (caracter === '"') {
        entreComillas = false;
      } else {
        actual += caracter;
      }
    } else if (caracter === '"') {
      entreComillas = true;
    } else if (caracter === separador) {
      celdas.push(actual);
      actual = "";
    } else {
      actual += caracter;
    }
  }
  celdas.push(actual);
  return celdas.map((celda) => celda.trim());
}

function normalizarEncabezado(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/%/g, "")
    .trim()
    .replace(/[\s.-]+/g, "_");
}

/**
 * Lee una cifra tal como la escribe una hoja de cálculo en Venezuela o en inglés: "1.234,56",
 * "1,234.56", "1234,5", "$ 12.000", "24,9 %". Si hay punto y coma a la vez, el último que
 * aparece es el decimal. Un punto solo seguido de exactamente tres dígitos se toma como
 * separador de miles (12.000 son doce mil), que es lo que significa en una venta de tienda.
 * Lo que no se entiende devuelve NaN: no se adivina, se marca.
 */
export function leerCifra(texto: string): number | null {
  let limpio = texto.replace(/[$\s%]/g, "").replace(/bs\.?/i, "");
  if (!limpio || limpio === "-") return null;

  const negativo = /^\(.*\)$/.test(limpio);
  if (negativo) limpio = limpio.slice(1, -1);

  const ultimoPunto = limpio.lastIndexOf(".");
  const ultimaComa = limpio.lastIndexOf(",");

  if (ultimoPunto >= 0 && ultimaComa >= 0) {
    const decimal = ultimoPunto > ultimaComa ? "." : ",";
    const miles = decimal === "." ? "," : ".";
    limpio = limpio.split(miles).join("").replace(decimal, ".");
  } else if (ultimaComa >= 0) {
    limpio = /^-?[1-9]\d{0,2}(,\d{3})+$/.test(limpio) && limpio.split(",").length > 2
      ? limpio.split(",").join("")
      : limpio.replace(",", ".");
  } else if (ultimoPunto >= 0 && /^-?[1-9]\d{0,2}(\.\d{3})+$/.test(limpio)) {
    limpio = limpio.split(".").join("");
  }

  const numero = Number(limpio);
  if (!Number.isFinite(numero)) return Number.NaN;
  return negativo ? -numero : numero;
}

/** Filas que el emisor suele colar entre las tiendas y que no son una tienda. */
const PATRON_SUBTOTAL = /^(sub)?total\b|^zona\b|^cadena\b/i;

export type ResultadoCsv =
  | { ok: true; lectura: ExtraccionVentasTipo }
  | { ok: false; error: string };

export function leerCsvVentas(contenido: string): ResultadoCsv {
  const lineas = contenido
    .replace(/^﻿/, "")
    .split(/\r\n|\n|\r/)
    .filter((linea) => linea.trim() !== "");

  if (lineas.length < 2) {
    return { ok: false, error: "El archivo no trae filas debajo del encabezado." };
  }
  if (lineas.length - 1 > MAXIMO_FILAS_CSV) {
    return { ok: false, error: `El archivo trae más de ${MAXIMO_FILAS_CSV} filas.` };
  }

  const separador = detectarSeparador(lineas[0]);
  const encabezados = partirLinea(lineas[0], separador).map(normalizarEncabezado);

  const posicion = new Map<string, number>();
  for (const columna of COLUMNAS_CSV) {
    const indice = encabezados.indexOf(columna.encabezado);
    if (indice >= 0) posicion.set(columna.clave, indice);
  }
  if (!posicion.has("tienda")) {
    return {
      ok: false,
      error: "Falta la columna «tienda». Descarga la plantilla y copia las cifras en ella.",
    };
  }
  const faltantes = COLUMNAS_CSV.filter((columna) => !posicion.has(columna.clave));
  if (faltantes.length === COLUMNAS_CSV.length - 1) {
    return {
      ok: false,
      error: "No se reconoce ninguna columna de cifras. Usa los encabezados de la plantilla.",
    };
  }

  const observaciones: string[] = [];
  if (faltantes.length) {
    observaciones.push(
      `El archivo no trae ${faltantes.map((columna) => `«${columna.encabezado}»`).join(", ")}: esas cifras quedan en blanco.`,
    );
  }

  const filas: ExtraccionVentasTipo["filas"] = [];
  const subtotalesDeclarados: ExtraccionVentasTipo["subtotalesDeclarados"] = [];

  lineas.slice(1).forEach((linea, desplazamiento) => {
    const numeroLinea = desplazamiento + 2;
    const celdas = partirLinea(linea, separador);
    const tienda = celdas[posicion.get("tienda")!] ?? "";
    if (!tienda) {
      observaciones.push(`Línea ${numeroLinea}: sin nombre de tienda, se omitió.`);
      return;
    }

    const valores = {} as Record<ClaveNumerica, number | null>;
    for (const columna of COLUMNAS_CSV) {
      if (columna.clave === "tienda") continue;
      const indice = posicion.get(columna.clave);
      const cifra = indice === undefined ? null : leerCifra(celdas[indice] ?? "");
      if (cifra !== null && Number.isNaN(cifra)) {
        observaciones.push(
          `Línea ${numeroLinea} (${tienda}): «${celdas[indice!]}» en ${columna.encabezado} no es una cifra; queda en blanco.`,
        );
        valores[columna.clave] = null;
      } else {
        valores[columna.clave] = cifra;
      }
    }

    // Un subtotal nunca se guarda como tienda: se compara contra la suma al confirmar.
    if (PATRON_SUBTOTAL.test(tienda)) {
      subtotalesDeclarados.push({
        etiqueta: tienda,
        ventas: valores.ventasReal,
        unidades: valores.unidadesReal,
        transacciones: valores.transaccionesReal,
      });
      return;
    }

    filas.push({ tienda, ...valores });
  });

  if (!filas.length) {
    return { ok: false, error: "El archivo no trae ninguna fila de tienda." };
  }

  return { ok: true, lectura: { periodo: null, filas, subtotalesDeclarados, observaciones } };
}

/** La plantilla lleva el catálogo ya escrito, para que solo haya que pegar las cifras. */
export function plantillaCsv(tiendas: string[]): string {
  const escapar = (texto: string) => (/[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto);
  const encabezado = COLUMNAS_CSV.map((columna) => columna.encabezado).join(";");
  const vacias = ";".repeat(COLUMNAS_CSV.length - 1);
  return [encabezado, ...tiendas.map((tienda) => `${escapar(tienda)}${vacias}`)].join("\r\n") + "\r\n";
}
