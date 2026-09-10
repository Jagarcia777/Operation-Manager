import type { NextRequest } from "next/server";
import { datosInformeEjecutivo, datosPresentacionTienda } from "@/lib/documentos/datos";
import { docxInformeEjecutivo, docxPresentacionTienda } from "@/lib/documentos/exportar";
import { nombreDeArchivo } from "@/lib/documentos/nombre";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const corteId = searchParams.get("corte") ?? "";
  const tiendaId = searchParams.get("tienda") ?? "";
  const esTienda = searchParams.get("tipo") === "tienda";

  if (esTienda) {
    const datos = await datosPresentacionTienda(corteId, tiendaId);
    if (!datos) return new Response("No encontrado", { status: 404 });
    return respuesta(
      await docxPresentacionTienda(datos),
      nombreDeArchivo(`${datos.tienda.nombre}-${datos.corte.nombre}`, "docx"),
    );
  }

  const datos = await datosInformeEjecutivo(corteId);
  if (!datos) return new Response("No encontrado", { status: 404 });
  return respuesta(
    await docxInformeEjecutivo(datos),
    nombreDeArchivo(`informe-ejecutivo-${datos.corte.nombre}`, "docx"),
  );
}

function respuesta(contenido: Buffer, nombre: string) {
  return new Response(new Uint8Array(contenido), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}
