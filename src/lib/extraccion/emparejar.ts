// Empareja los nombres leídos del documento con el catálogo de tiendas. Lo que no empareja con
// certeza no se adivina: queda marcado para que una persona lo asigne.

export function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type Emparejamiento = {
  nombreLeido: string;
  tiendaId: string | null;
  tiendaNombre: string | null;
  exacto: boolean;
};

type TiendaCatalogo = {
  id: string;
  nombre: string;
  codigo: string | null;
  alias?: string | null;
};

/** Nombre oficial, código y todos los alias con los que la tienda aparece en los reportes. */
function nombresDe(tienda: TiendaCatalogo) {
  const alias = (tienda.alias ?? "")
    .split(/[\n,;]/)
    .map((entrada) => entrada.trim())
    .filter(Boolean);
  return [tienda.nombre, ...(tienda.codigo ? [tienda.codigo] : []), ...alias].map(normalizar);
}

export function emparejarTienda(
  nombreLeido: string,
  catalogo: TiendaCatalogo[],
): Emparejamiento {
  const objetivo = normalizar(nombreLeido);

  const exacta = catalogo.find((tienda) => nombresDe(tienda).includes(objetivo));
  if (exacta) {
    return {
      nombreLeido,
      tiendaId: exacta.id,
      tiendaNombre: exacta.nombre,
      exacto: true,
    };
  }

  const parcial = catalogo.find((tienda) =>
    nombresDe(tienda).some(
      (nombre) =>
        objetivo.length > 2 && (nombre.includes(objetivo) || objetivo.includes(nombre)),
    ),
  );

  return {
    nombreLeido,
    tiendaId: parcial?.id ?? null,
    tiendaNombre: parcial?.nombre ?? null,
    exacto: false,
  };
}

export function emparejarTodas(nombres: string[], catalogo: TiendaCatalogo[]) {
  return nombres.map((nombre) => emparejarTienda(nombre, catalogo));
}
