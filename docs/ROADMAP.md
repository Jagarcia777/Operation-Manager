# Roadmap

Estado de construcción. Marcar las casillas al completar cada bloque y dejar una nota breve
si algo queda a medias.

## Fase 0 — Base del proyecto

- [x] Scaffold Next.js 16 + TypeScript + Tailwind v4
- [x] Dependencias: Prisma, Anthropic SDK, pptxgenjs, docx
- [x] Documentos de contexto (`CLAUDE.md`, `docs/ESPECIFICACION.md`, este roadmap)
- [x] Hook de inicio de sesión y permisos en `.claude/`
- [x] Esquema Prisma + migraciones + seed (4 zonas, 24 tiendas, 2 cortes, umbrales, perfil)

## Fase 1 — Datos y cálculos

- [x] `src/lib/dominio.ts`: constantes y tipos del dominio
- [x] `src/lib/calculos.ts`: KPIs derivados, subtotales por zona, total cadena, cumplimiento
- [x] Administración de zonas, tiendas, cortes, umbrales, perfil y memoria operativa
- [ ] Captura manual por tienda/corte + importación CSV de respaldo

## Fase 2 — Ingesta con IA

- [x] Subida de PDF/imagen y almacenamiento local del archivo original
- [x] Extracción estructurada con `claude-opus-5` y esquema validado
- [x] Emparejamiento de tiendas leídas contra el catálogo
- [x] Pantalla de revisión y confirmación (nada se guarda sin aprobación)
- [x] Contraste de los subtotales impresos contra la suma calculada

## Fase 3 — Tableros

- [x] Tablero de Control de Ventas (por zona, con subtotales y total cadena)
- [x] Proyección de cierre de mes
- [x] Consolidado de Aportes
- [x] Reporte de Ajustes por Tipología (monto y % sobre ventas)

## Fase 4 — Validación

- [x] Motor de alertas con las cinco reglas de la especificación
- [x] Bandeja de alertas: revisar, descartar, dejar constancia

## Fase 5 — Cerebro analítico

- [x] Evidencia determinista del corte (KPIs, zonas, tiendas, ajustes, comparativo, alertas)
- [x] Análisis con criterio de dirección de operaciones retail
- [x] Hallazgos con evidencia y causa probable, recomendaciones priorizadas por $
- [x] Escenarios de cierre y límites explícitos de la data
- [ ] Crear un plan de acción directamente desde una recomendación

## Fase 6 — Documentos de decisión

- [x] Planes de acción (cadena / zona / tienda) con metas, cronograma a 3 meses y $ oportunidad
- [x] Presentación de tienda (vista + impresión a PDF)
- [x] Informe ejecutivo (vista + impresión a PDF)
- [x] Exportación a PowerPoint (.pptx) y Word (.docx)

## Fase 7 — Cierre

- [x] Navegación agrupada y sistema visual consistente
- [x] `npm run build` y `npm run lint` limpios
- [x] Recorrido en navegador de tablero, inicio, ajustes, informe y configuración
- [ ] Recorrido de la ingesta con IA con un documento real (requiere `ANTHROPIC_API_KEY`)

## Ideas pendientes de aprobación

Están descritas en `docs/ESPECIFICACION.md` §4: registrar el resultado de cada plan, catálogo de
acciones por tipo de problema, vista de ventas comparables, productividad por m² y por hora-hombre.
