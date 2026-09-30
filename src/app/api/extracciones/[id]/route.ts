import { prisma } from "@/lib/db";
import { nombreDeArchivo } from "@/lib/documentos/nombre";

const EXTENSIONES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

/** Devuelve el documento original de una extracción, que es el respaldo de auditoría. */
export async function GET(_peticion: Request, contexto: RouteContext<"/api/extracciones/[id]">) {
  const { id } = await contexto.params;
  const extraccion = await prisma.extraccion.findUnique({ where: { id } });

  if (!extraccion?.archivoContenido) {
    return new Response("No encontrado", { status: 404 });
  }

  const extension = EXTENSIONES[extraccion.archivoTipo] ?? "bin";
  return new Response(new Uint8Array(extraccion.archivoContenido), {
    headers: {
      "Content-Type": extraccion.archivoTipo,
      "Content-Disposition": `inline; filename="${nombreDeArchivo(extraccion.archivoNombre, extension)}"`,
    },
  });
}
