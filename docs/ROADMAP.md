# Roadmap

Estado de construcción. Marcar las casillas al completar cada bloque y dejar una nota breve
si algo queda a medias.

## Fase 0 — Base del proyecto

- [x] Scaffold Next.js 16 + TypeScript + Tailwind v4
- [x] Dependencias: Prisma, Anthropic SDK, pptxgenjs, docx
- [x] Documentos de contexto (`CLAUDE.md`, `docs/ESPECIFICACION.md`, este roadmap)
- [x] Hook de inicio de sesión y permisos en `.claude/`
- [x] Esquema Prisma + migraciones + seed (4 zonas, 24 tiendas, 2 cortes, umbrales, perfil maestro)
- [x] `src/lib/dominio.ts`: constantes y tipos del dominio

## Fase 1 — Datos y cálculos

- [ ] `src/lib/calculos.ts`: KPIs derivados, subtotales por zona, total cadena, cumplimiento
- [ ] Captura manual por tienda/corte + importación CSV de respaldo
- [ ] Administración de zonas, tiendas y cortes
- [ ] Perfil del usuario maestro, memoria operativa y umbrales editables

## Fase 2 — Ingesta con IA

- [ ] Subida de PDF/imagen y almacenamiento del archivo original
- [ ] Extracción estructurada con `claude-opus-5` y esquema validado
- [ ] Emparejamiento de tiendas leídas contra el catálogo
- [ ] Pantalla de revisión y confirmación (nada se guarda sin aprobación)

## Fase 3 — Tableros

- [ ] Tablero de Control de Ventas (por zona, con subtotales y total cadena)
- [ ] Proyección de cierre de mes
- [ ] Consolidado de Aportes
- [ ] Reporte de Ajustes por Tipología

## Fase 4 — Validación

- [ ] Motor de alertas con las cinco reglas de la especificación
- [ ] Bandeja de alertas: revisar, descartar, dejar constancia

## Fase 5 — Documentos de decisión

- [ ] Planes de acción (cadena / zona / tienda) con metas, cronograma a 3 meses y $ oportunidad
- [ ] Presentación de tienda (vista + impresión a PDF)
- [ ] Informe ejecutivo (vista + impresión a PDF)
- [ ] Exportación a PowerPoint (.pptx) y Word (.docx)

## Fase 6 — Cierre

- [ ] Navegación y estilos consistentes en todos los módulos
- [ ] `npm run build` y `npm run lint` limpios
- [ ] Recorrido funcional en el navegador de cada módulo
