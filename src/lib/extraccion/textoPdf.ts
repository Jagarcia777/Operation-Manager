import "server-only";
import { getDocumentProxy } from "unpdf";
import type { ItemTexto } from "./categoriasTienda";

/**
 * Texto de la primera página de un PDF con la posición de cada fragmento, en el orden en que el
 * documento lo guarda. Si el PDF es un escaneo o una foto no trae texto y devuelve una lista
 * vacía: ese caso sigue yendo a la lectura con IA.
 */
export async function textoDePdf(contenido: Uint8Array): Promise<ItemTexto[]> {
  try {
    const documento = await getDocumentProxy(new Uint8Array(contenido));
    const pagina = await documento.getPage(1);
    const { items } = await pagina.getTextContent();
    return items.flatMap((item) =>
      "str" in item
        ? [{ texto: item.str, x: Math.round(item.transform[4]), y: Math.round(item.transform[5]) }]
        : [],
    );
  } catch {
    return [];
  }
}
