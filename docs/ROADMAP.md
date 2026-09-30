# Roadmap

Estado de construcción. Marcar las casillas al completar cada bloque y dejar una nota breve
si algo queda a medias.

## Fase 0 — Base del proyecto

- [x] Scaffold Next.js 16 + TypeScript + Tailwind v4
- [x] Dependencias: Prisma, Anthropic SDK, pptxgenjs, docx
- [x] Documentos de contexto (`CLAUDE.md`, `docs/ESPECIFICACION.md`, este roadmap)
- [x] Hook de inicio de sesión y permisos en `.claude/`
- [x] Esquema Prisma + migraciones + seed (zonas, tiendas, cortes, umbrales, perfil)

## Fase 1 — Datos y cálculos

- [x] `src/lib/dominio.ts`: constantes y tipos del dominio
- [x] `src/lib/calculos.ts`: KPIs derivados, subtotales por zona, total cadena, cumplimiento
- [x] Administración de zonas, tiendas, cortes, umbrales, perfil y memoria operativa
- [x] Captura manual por tienda/corte (respaldo sin IA)
- [x] Importación CSV con plantilla fija (pasa por la misma revisión que la lectura con IA)

## Fase 2 — Ingesta con IA

- [x] Subida de PDF/imagen y almacenamiento local del archivo original
- [x] Extracción estructurada con `claude-opus-5` y esquema validado
- [x] Emparejamiento de tiendas leídas contra el catálogo
- [x] Pantalla de revisión y confirmación (nada se guarda sin aprobación)
- [x] Contraste de los subtotales impresos contra la suma calculada

## Fase 3 — Tableros

- [x] Tablero de Control de Ventas (Zona Oriente al detalle, resto de la cadena por total de zona)
- [x] Proyección de cierre de mes
- [x] Consolidado de Aportes
- [x] Reporte de Ajustes por Tipología (monto y % sobre ventas, con el signo de la fuente)
- [x] Categorías con ranking Pareto 80/20 y clasificación BCG

## Fase 4 — Validación

- [x] Motor de alertas con las cinco reglas de la especificación
- [x] Bandeja de alertas: revisar, descartar, dejar constancia

## Fase 5 — Cerebro analítico

- [x] Evidencia determinista del corte (KPIs, zonas, tiendas, ajustes, comparativo, alertas)
- [x] Análisis con criterio de dirección de operaciones retail
- [x] Hallazgos con evidencia y causa probable, recomendaciones priorizadas por $
- [x] Escenarios de cierre y límites explícitos de la data
- [x] Crear un plan de acción directamente desde una recomendación

## Fase 6 — Documentos de decisión

- [x] Planes de acción (cadena / zona / tienda) con metas, cronograma a 3 meses y $ oportunidad
- [x] Informe ejecutivo con la estructura real: indicadores contra cadena y benchmark, scorecard
      por tienda con fortalezas y alertas, tendencia por ritmo diario, categorías, Balanced
      Scorecard, escenarios de cierre, ajustes y conclusiones
- [x] Benchmarks cargables desde Configuración (la app no inventa referencias)
- [x] Exportación del informe ejecutivo a PowerPoint (.pptx) y Word (.docx)
- [x] Presentación de tienda con sus 7 secciones: indicadores contra zona y cadena, diagnóstico
      con ajustes y mezcla por categoría, evolución por ritmo diario, Balanced Scorecard
      individual, proyección con exigencia de cierre, plan de acción y conclusiones
- [x] Exportación de la presentación de tienda a PowerPoint y Word
- [x] Venta diaria para el análisis por día de la semana

## Fase 7 — Salir del equipo

- [x] Autenticación: contraseña, sesión firmada y protección de todas las rutas
- [x] Identidad de marca propia con monograma configurable
- [x] Migración de SQLite a PostgreSQL
- [x] Documentación del despliegue
- [x] Carga automática del catálogo en el primer despliegue
- [x] Desplegado en Vercel con PostgreSQL en Neon
- [ ] Probar desde el móvil

## Fase 8 — Cierre

- [x] Navegación agrupada y sistema visual consistente
- [x] `npm run build` y `npm run lint` limpios
- [x] Recorrido en navegador de tablero, inicio, ajustes, informe y configuración
- [ ] Recorrido de la ingesta con IA con un documento real (requiere `ANTHROPIC_API_KEY`)

## Fase 9 — Presentación

- [x] Generador de demostración: cadena inventada con un año de cierres de mes
- [x] Gráficos de indicadores en SVG propio, sin librerías de terceros
- [x] Cerrar sesión visible también en móvil
- [x] Siluetas de carga para que el cambio de pestaña sea inmediato
- [x] Paleta y botones alineados a los valores de Apple

## Fase 10 — Comparación en el tiempo

- [x] Evolución mensual por tienda: tabla comparativa con minigráfica y variación
- [x] Medidores de la zona contra los benchmarks cargados
- [x] Análisis precargado en el demo, derivado de sus propias cifras
- [x] Manual de usuario con la especificación del Dashboard Ejecutivo y prompt para agentes

## Fase 11 — Checklists de operación

- [x] Plantillas de checklist con puntos, área y marca de punto crítico
- [x] Inspección por tienda: actividad, validación, observación, corrección y estatus
- [x] Seguimiento de correcciones abiertas con responsable, fecha límite y vencidas
- [x] Cuatro checklists de supermercado cargados en la demostración

## Fase 12 — Eficiencia de la plantilla

- [x] Catorce áreas con su KPI (SPLH, UPLH, TPLH o cobertura) y su rango de referencia
- [x] Índice agregado por horas ganadas, ponderado por horas y no promediando razones
- [x] Captura por tienda que solo pide el volumen que mide cada área
- [x] Alertas de horas descuadradas y de estándar fuera de escala
- [x] Comparación entre tiendas, evolución del índice y demo con un año de datos

## Fase 13 — El informe real de la cadena

- [x] Las 25 sucursales del Resumen Ejecutivo en el catálogo, con su grafía del sistema emisor
- [x] Las 29 categorías reales con alias para la lectura automática
- [x] Un archivo alimenta el corte del día y el del acumulado del mes
- [x] Meta en cero se lee como meta no cargada, y se dice una vez y no veinticinco
- [x] Conciliación de PP, UNDTKT y TKTPROM impresos contra los derivados
- [x] Mezcla por categoría de cadena, top de productos y serie diaria
- [x] Ritmo diario: semana contra semana, que es lo que el informe no dice

## Fase 14 — Reportes por tienda

- [x] Reporte de ventas por categoría de cada tienda leído directo del PDF, sin IA
- [x] Varios reportes en una sola subida, con la tienda y el corte deducidos del documento
- [x] Margen acumulado por tienda, que el Resumen Ejecutivo no publica
- [x] «% Venta» impreso contra el derivado: se dice una vez por corte
- [x] Productos vendidos a costo o por debajo, con alerta de cadena desde tres tiendas
- [x] Libro de ajustes vs ventas (Excel) leído sin IA: solo cifras base, los % se derivan
- [x] Tipologías Donación, Mercadeo y Hurto; ajuste en unidades junto al monto en USD
- [x] Ajuste por categoría de cada tienda y de la cadena, contra la venta de la categoría
- [x] Cadena como línea de comparación y CENDI Timote como centro que abastece a Oriente
- [x] Venta del libro contrastada con el ritmo conocido: detecta un período que no cuadra
- [ ] Top 10 de productos por tienda

## Pendiente del lado del usuario

No son tareas de código: la aplicación ya las admite desde Configuración.

- [x] ~~Nombrar las cinco zonas de comparación~~ — el informe trae las 25 sucursales abiertas
- [x] ~~Revisar las categorías~~ — cargadas las 29 del Resumen Ejecutivo
- [ ] Repartir por zona las 19 sucursales que hoy están en "Resto de la cadena"
- [ ] Cargar los benchmarks de margen, RPT, UPT, ASP y merma
- [ ] Calibrar el estándar de Administración y Gerencia con histórico propio
- [ ] Confirmar qué cuenta la columna TRANS: no es la base del TKTPROM impreso

## Ideas pendientes de aprobación

Están descritas en `docs/ESPECIFICACION.md` §4: registrar el resultado de cada plan, catálogo de
acciones por tipo de problema, vista de ventas comparables, productividad por m² y por hora-hombre.
