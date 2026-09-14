import type { KpiPlantilla } from "@/lib/dominio";

/**
 * Catálogo de áreas de la tienda con su KPI y su rango de referencia internacional.
 * Sale de la hoja "Estándares por Área" de la herramienta de eficiencia de plantilla
 * (NRF, RILA, IGD, WERC, ISSA). Se siembra una vez y se edita desde Configuración: son
 * referencias generales que hay que calibrar con el histórico propio antes de usarlas
 * como meta formal, tal como advierte la propia metodología.
 *
 * El rango se guarda completo, no solo su punto medio: un área dentro del rango cumple
 * aunque no llegue al centro, y perder los extremos convierte dispersión normal de la
 * industria en una desviación que no existe.
 */
export type AreaSemilla = {
  nombre: string;
  kpi: KpiPlantilla;
  estandarMin: number | null;
  estandarMax: number | null;
  estandar: number | null;
  fuente: string;
  nota: string;
  usaVentaTienda?: boolean;
};

export const AREAS_OPERATIVAS: AreaSemilla[] = [
  {
    nombre: "Cajas (Front End)",
    kpi: "TPLH",
    estandarMin: 12,
    estandarMax: 20,
    estandar: 16,
    fuente: "NRF / RILA — Front End Productivity",
    nota: "Complementar con artículos por minuto (18–25) si hay estudio de tiempos.",
  },
  {
    nombre: "Piso de Venta — Abarrotes / Secos",
    kpi: "UPLH",
    estandarMin: 80,
    estandarMax: 150,
    estandar: 115,
    fuente: "IGD — Grocery Store Standards",
    nota: "Varía según tamaño de empaque y altura de anaquel.",
  },
  {
    nombre: "Perecederos — Carnicería",
    kpi: "SPLH",
    estandarMin: 80,
    estandarMax: 150,
    estandar: 115,
    fuente: "NRF / IGD — Perishables Benchmarking",
    nota: "Incluye el tiempo de preparación y corte, no solo el despacho.",
  },
  {
    nombre: "Perecederos — Charcutería",
    kpi: "SPLH",
    estandarMin: 70,
    estandarMax: 130,
    estandar: 100,
    fuente: "NRF / IGD — Perishables Benchmarking",
    nota: "Sensible al tiempo de atención personalizada al cliente.",
  },
  {
    nombre: "Panadería y Pastelería",
    kpi: "SPLH",
    estandarMin: 60,
    estandarMax: 120,
    estandar: 90,
    fuente: "IGD — In-Store Bakery Standards",
    nota: "Incluye las horas de producción, no solo la venta en mostrador.",
  },
  {
    nombre: "Frutas y Hortalizas",
    kpi: "SPLH",
    estandarMin: 70,
    estandarMax: 130,
    estandar: 100,
    fuente: "IGD — Produce Department Standards",
    nota: "Alta sensibilidad a mermas: cruzar con el porcentaje de merma sobre ventas.",
  },
  {
    nombre: "Lácteos y Refrigerados",
    kpi: "UPLH",
    estandarMin: 100,
    estandarMax: 180,
    estandar: 140,
    fuente: "IGD — Grocery Store Standards",
    nota: "Incluye la rotación por fecha de vencimiento (FEFO).",
  },
  {
    nombre: "Congelados",
    kpi: "UPLH",
    estandarMin: 90,
    estandarMax: 160,
    estandar: 125,
    fuente: "IGD — Grocery Store Standards",
    nota: "Considerar el tiempo adicional por manejo en frío.",
  },
  {
    nombre: "Recepción y Almacén",
    kpi: "UPLH",
    estandarMin: 60,
    estandarMax: 120,
    estandar: 90,
    fuente: "WERC — Warehouse Labor Standards",
    nota: "Ajustar por tipo de unidad de carga: pallet completo o caja suelta.",
  },
  {
    nombre: "Reposición General / Abastecimiento",
    kpi: "UPLH",
    estandarMin: 90,
    estandarMax: 160,
    estandar: 125,
    fuente: "IGD — Replenishment Standards",
    nota: "Diferenciar la reposición programada de la reactiva.",
  },
  {
    nombre: "Limpieza y Mantenimiento",
    kpi: "COBERTURA",
    estandarMin: null,
    estandarMax: null,
    estandar: 100,
    fuente: "ISSA — Cleaning Industry Standards",
    nota: "No se mide por venta. La referencia de m² por hora (250–350) exige medir superficie atendida.",
  },
  {
    nombre: "Seguridad y Prevención de Pérdidas",
    kpi: "COBERTURA",
    estandarMin: null,
    estandarMax: null,
    estandar: 100,
    fuente: "NRF — Loss Prevention Framework",
    nota: "Un oficial por entrada o salida activa. Se mide por cobertura, no por productividad.",
  },
  {
    nombre: "Atención al Cliente / Servicio",
    kpi: "TPLH",
    estandarMin: 10,
    estandarMax: 18,
    estandar: 14,
    fuente: "NRF — Customer Service Benchmarking",
    nota: "Incluye devoluciones, cambios y consultas.",
  },
  {
    // Sin estándar cargado a propósito. La referencia publicada (400–800 $/hora) supone un
    // tamaño de tienda y un alcance de "administración" que no tienen por qué coincidir con
    // los de esta cadena, y aplicarla a ciegas marcaría como desviación lo que es una
    // diferencia de escala. Se muestra la productividad real y se califica cuando el usuario
    // cargue su propia referencia desde Configuración.
    nombre: "Administración y Gerencia de Tienda",
    kpi: "SPLH",
    estandarMin: null,
    estandarMax: null,
    estandar: null,
    fuente: "RILA — Store Management Productivity",
    nota: "Referencia publicada: 400–800 $/hora sobre la venta de toda la tienda. Calibrar con el histórico propio antes de usarla como meta.",
    usaVentaTienda: true,
  },
];
