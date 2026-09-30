import "server-only";
import ExcelJS from "exceljs";
import type { Hoja } from "./libroAjustes";

/**
 * Las hojas de un libro de Excel como matrices de valores. Las fórmulas entran con su último
 * resultado calculado, que es lo que la persona vio al guardar el archivo. Si el archivo no es
 * un libro válido devuelve una lista vacía.
 */
export async function hojasDeExcel(contenido: Uint8Array): Promise<Hoja[]> {
  try {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(contenido as unknown as ArrayBuffer);
    return libro.worksheets.map((hoja) => {
      const filas: Hoja["filas"] = [];
      hoja.eachRow({ includeEmpty: true }, (fila, numeroFila) => {
        const celdas: (string | number | null)[] = [];
        fila.eachCell({ includeEmpty: true }, (celda, numeroColumna) => {
          celdas[numeroColumna - 1] = valorDe(celda.value);
        });
        filas[numeroFila - 1] = Array.from(celdas, (valor) => valor ?? null);
      });
      return { nombre: hoja.name, filas: Array.from(filas, (fila) => fila ?? []) };
    });
  } catch {
    return [];
  }
}

function valorDe(valor: ExcelJS.CellValue): string | number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "number" || typeof valor === "string") return valor;
  if (typeof valor === "object" && "result" in valor) {
    const resultado = valor.result;
    return typeof resultado === "number" || typeof resultado === "string" ? resultado : null;
  }
  if (typeof valor === "object" && "richText" in valor) {
    return valor.richText.map((parte) => parte.text).join("");
  }
  return null;
}
