import { cargarTiendas } from "@/lib/consultas";
import { plantillaCsv } from "@/lib/csv";

/** Plantilla fija de la importación CSV, con las tiendas del catálogo ya escritas. */
export async function GET() {
  const tiendas = await cargarTiendas();
  // El BOM hace que Excel abra el archivo en UTF-8 y no rompa las tildes de "Maturín".
  const contenido = "﻿" + plantillaCsv(tiendas.map((tienda) => tienda.nombre));
  return new Response(contenido, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-ventas.csv"',
    },
  });
}
