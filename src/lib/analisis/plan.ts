import { emparejarTienda, normalizar } from "@/lib/extraccion/emparejar";
import type { AlcancePlan } from "@/lib/dominio";
import type { AnalisisCorteTipo } from "./esquema";

// De una recomendación del análisis a un plan de acción. El plan nace en borrador con lo que
// la recomendación ya dice —acción, ámbito, oportunidad y cómo se mide— y nada más: el valor
// objetivo, el responsable y la fecha los pone quien lo va a ejecutar, no el modelo.

type Recomendacion = AnalisisCorteTipo["recomendaciones"][number];

type TiendaCatalogo = { id: string; nombre: string; codigo: string | null; alias?: string | null };
type ZonaCatalogo = { id: string; nombre: string };

export type AmbitoResuelto = { alcance: AlcancePlan; zonaId: string | null; tiendaId: string | null };

/**
 * El ámbito llega como texto libre ("Puerto Ordaz", "Zona Oriente", "Cadena"). Se busca primero
 * una tienda por nombre exacto o alias, después una zona, y por último una tienda por parecido;
 * lo que no se reconoce queda como plan de cadena, que el usuario puede acotar después.
 */
export function resolverAmbito(
  ambito: string,
  zonas: ZonaCatalogo[],
  tiendas: TiendaCatalogo[],
): AmbitoResuelto {
  const cadena: AmbitoResuelto = { alcance: "CADENA", zonaId: null, tiendaId: null };
  const objetivo = normalizar(ambito);
  if (!objetivo || /^(la )?cadena\b|^todas?\b/.test(objetivo)) return cadena;

  const tienda = emparejarTienda(ambito, tiendas);
  if (tienda.tiendaId && tienda.exacto) {
    return { alcance: "TIENDA", zonaId: null, tiendaId: tienda.tiendaId };
  }

  const zona = zonas.find((candidata) => {
    const nombre = normalizar(candidata.nombre);
    return nombre.length > 2 && (objetivo.includes(nombre) || nombre.includes(objetivo));
  });
  if (zona) return { alcance: "ZONA", zonaId: zona.id, tiendaId: null };

  if (tienda.tiendaId) return { alcance: "TIENDA", zonaId: null, tiendaId: tienda.tiendaId };
  return cadena;
}

/** Mes del cronograma de tres meses en que cae el primer hito, según el plazo recomendado. */
const MES_POR_PLAZO: Record<Recomendacion["plazo"], number> = {
  INMEDIATO: 1,
  "30_DIAS": 1,
  "90_DIAS": 3,
};

const TEXTO_PLAZO: Record<Recomendacion["plazo"], string> = {
  INMEDIATO: "inmediato",
  "30_DIAS": "30 días",
  "90_DIAS": "90 días",
};

/** Título corto: la acción completa va en el diagnóstico y en el hito. */
export function tituloDePlan(accion: string, largo = 110) {
  const limpio = accion.replace(/\s+/g, " ").trim();
  if (limpio.length <= largo) return limpio;
  const corte = limpio.slice(0, largo);
  return `${corte.slice(0, Math.max(corte.lastIndexOf(" "), 60)).replace(/[,;:.\s]+$/, "")}…`;
}

export function planDesdeRecomendacion(recomendacion: Recomendacion, corteNombre: string) {
  return {
    titulo: tituloDePlan(recomendacion.accion),
    diagnostico:
      `Recomendación del análisis del corte ${corteNombre} (esfuerzo ${recomendacion.esfuerzo.toLowerCase()}, ` +
      `plazo ${TEXTO_PLAZO[recomendacion.plazo]}).\n\n${recomendacion.accion}`,
    // Si el análisis no pudo estimar la oportunidad, el plan tampoco la inventa.
    oportunidadUsd: recomendacion.impactoUsd ?? 0,
    meta: { indicador: recomendacion.comoMedirlo },
    hito: { mes: MES_POR_PLAZO[recomendacion.plazo], descripcion: recomendacion.accion },
  };
}
