# Operation Manager

Herramienta interna de **Zona Oriente de Rio Supermarket**: 6 tiendas gestionadas al detalle
—Puerto Ordaz, Plaza Mayor, Maturín Tipuro, Maturín Juanico, Puente Real y Valle de la Pascua—
medidas contra la cadena nacional, que entra como línea de comparación con el total de sus otras
zonas. Sustituye el mantenimiento manual del Tablero de Control de Ventas y del Reporte de Ajustes
por Tipología: ingesta los números de cada corte, los valida, detecta inconsistencias y genera los
documentos de decisión (presentaciones de tienda, informes ejecutivos, planes de acción).

Requisitos completos: `docs/ESPECIFICACION.md` — es la fuente de verdad, no re-derivar desde cero.
Estado y fases: `docs/ROADMAP.md` — actualizar las casillas al terminar cada bloque.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Prisma + PostgreSQL (adaptador `@prisma/adapter-pg`)
- `@anthropic-ai/sdk` para la extracción de PDF/imagen (`claude-opus-5`)
- `pptxgenjs` / `docx` para exportar PowerPoint y Word

## Comandos

```bash
npm run dev             # servidor de desarrollo
npm run build           # build de producción (verificación obligatoria antes de commit)
npm run lint            # eslint
npx prisma migrate dev  # crear/aplicar migración tras editar el schema
npx prisma db seed      # cargar zonas, tiendas y datos de ejemplo
npm run db:demo         # cadena de demostración con un año de historia
npx prisma studio       # inspeccionar la base de datos
npm test                # pruebas de los cálculos (node:test vía tsx)
npm run verificar       # lint + tipos + pruebas + build: correr esto antes de tocar main
```

## Mapa del repo

```
prisma/schema.prisma      modelo de datos (dominio en español)
prisma/seed.ts            catálogo de la zona y cortes de ejemplo
src/app/                  rutas App Router (una carpeta por módulo)
src/app/api/              route handlers (extracción IA, exportaciones)
src/lib/db.ts             singleton de PrismaClient
src/lib/calculos.ts       KPIs derivados, subtotales por zona, proyección, aportes
src/lib/plantilla.ts      eficiencia laboral: horas ganadas, índice por área, cobertura
src/lib/ritmo.ts          serie diaria de la cadena, sus dos comparativos y el perfil semanal
src/lib/areas.ts          las 14 áreas de tienda con su KPI y su rango de referencia
src/lib/validacion.ts     motor de alertas (nunca corrige, solo marca)
src/lib/csv.ts            importación CSV con plantilla fija (entra como propuesta)
src/lib/analisis/         cerebro analítico: evidencia determinista + asesoría con IA
src/lib/extraccion/       ingesta con IA de PDF/imagen
src/lib/extraccion/resumen.ts    guarda el Resumen Ejecutivo de la cadena (día + acumulado)
src/lib/extraccion/conciliar.ts  lo impreso contra lo derivado
src/lib/documentos/       generación de PPTX/DOCX
src/components/           componentes compartidos de UI
src/components/graficos/  gráficos en SVG propio (sin librerías: no se cargan terceros)
src/lib/demo.ts           generador de la cadena de demostración (un año de historia)
src/app/(panel)/inspecciones/  checklists de operación y seguimiento de correcciones
src/app/(panel)/plantilla/     índice de eficiencia laboral por área
```

## Convenciones

- **Vocabulario del dominio en español** en modelos, campos, rutas y UI (`Tienda`, `Corte`,
  `Merma`, `Meta`/`Real`). El andamiaje técnico genérico va en inglés. No traducir términos
  del negocio: "Activo" es el valor real ejecutado, no un booleano.
- **Los tipos cerrados son `String`, no enums de base de datos**: las uniones se declaran en
  `src/lib/dominio.ts` (constantes + tipos TS), de modo que sumar una tipología o un estado sea
  un cambio de código y no una migración. Los payloads JSON se guardan como texto.
- **Los subtotales y totales nunca se capturan** en las zonas detalladas: se derivan del detalle
  por tienda. Si una fuente externa trae un subtotal, se compara y se levanta una alerta si
  difiere. La excepción son las zonas con `detallada = false`, de las que solo llega el agregado:
  esas usan `RegistroZona` y su total sí se captura, porque no hay detalle del cual derivarlo.
- **Los ajustes por tipología van con el signo de la fuente**: negativos cuando son en contra.
  La tipología "Ventas" puede salir a favor. Al comparar magnitudes, usar valor absoluto.
- **Una no conformidad sin responsable ni fecha no se cierra nunca.** En los checklists, lo que
  sale No OK exige observación y corrección; un punto marcado `critico` impide cerrar la
  inspección si no la tiene. Al guardar, lo que vuelve a OK pierde su observación y su
  corrección: si no, la hoja seguiría contando hallazgos que ya no existen.
- **Una meta en cero es una meta que no llegó, no una meta de cero.** El Resumen Ejecutivo de
  la cadena publica la columna METAS en cero para todas las sucursales: entra como faltante
  (`metaDeclarada` en `src/lib/carga.ts`), el cumplimiento queda en blanco y el hallazgo se
  levanta una sola vez para todo el corte, no una por tienda.
- **Lo que el informe trae ya calculado se guarda pero no se usa para decidir**: se deriva el
  propio y se comparan. Si difieren de forma pareja en casi todas las sucursales no son
  veinticinco errores sino una definición distinta, y se dice una vez.
- **La app nunca corrige datos en silencio.** Toda inconsistencia se registra como `Alerta`
  con su explicación y queda para que una persona confirme o descarte.
- Todo dato extraído por IA entra como *propuesta*: requiere revisión humana antes de guardarse.
- **El cerebro analítico interpreta, no calcula.** Las cifras se derivan siempre en
  `src/lib/calculos.ts`; el modelo recibe esa evidencia ya calculada y aporta diagnóstico,
  estimación y recomendaciones con criterio de director de operaciones retail
  (`docs/ESPECIFICACION.md` §2.8). Nunca se le pide que invente o recalcule números.
- **Antes de commitear, `npm run verificar`**: lint, tipos, pruebas y build. Cada error de
  método de este proyecto —margen promediado en vez de ponderado, variación inflada por
  comparar acumulados de distinta longitud— se encontró mirando la pantalla. Las pruebas
  fijan esas reglas para que falle el comando y no el informe.
- **Tras `prisma generate`, reiniciar `npm run dev`**: el servidor mantiene en memoria el cliente
  anterior y falla con columnas que "no existen" aunque la migración ya se haya aplicado.
- Componentes de servidor por defecto; `"use client"` solo donde haga falta interacción.
- Server Actions para mutaciones; route handlers solo para archivos y respuestas binarias.

## Diseño visual

Referencia: Apple (HIG). Profesional, sobrio y con la jerarquía puesta en el dato, no en el adorno.
Los tokens viven en `src/app/globals.css`; usarlos siempre en vez de valores sueltos.

- **Tipografía**: stack del sistema (SF Pro / system-ui). Títulos con `tracking` ajustado
  (-0.02em) y peso 600; cuerpo 400. La jerarquía se hace con tamaño y peso, no con color.
- **Color**: fondo tenue, superficies blancas y un solo acento azul. Gris para lo secundario.
  Semánticos solo para estado: verde cumple, ámbar atención, rojo desviación.
- **Superficies**: tarjetas con radio 12px, sombra muy suave y separadores *hairline*.
  Nada de bordes gruesos ni líneas verticales en tablas.
- **Tablas**: cifras con `tabular-nums` alineadas a la derecha, encabezado fijo, filas de zona
  destacadas por peso y fondo tenue. Legibles al imprimir.
- **Movimiento**: transiciones de 200ms ease-out. Discreto, nunca decorativo.
- **Modo oscuro** desde el inicio, con los mismos tokens.
- **Manejo simple**: una intención por pantalla y un camino obvio para completarla. Pocas
  opciones a la vista, acción principal evidente, nada de jerga técnica en la interfaz. Si algo
  se puede deducir del dato, la app lo deduce en vez de pedírselo al usuario.

## Seguridad

La data del negocio es sensible (`docs/ESPECIFICACION.md` §5).

- **Un solo usuario, siempre autenticado**: sesión firmada con HMAC en cookie `httpOnly` y
  contraseña en hash scrypt. El middleware protege todo salvo `/entrar` y los estáticos.
  Cualquier ruta nueva queda protegida por defecto; no agregar excepciones al matcher sin motivo.
- Sin recursos de terceros en el cliente: tipografías del sistema, CSP restringida al propio
  origen, sin analítica. No agregar CDNs, fuentes remotas ni scripts externos.
- La única salida a internet es la API de Anthropic, siempre desde el servidor y solo con lo
  mínimo necesario (el archivo a extraer o las métricas ya calculadas, nunca la base completa).
  Si falta `ANTHROPIC_API_KEY`, esas funciones se desactivan y el resto sigue operando.
- `ANTHROPIC_API_KEY` jamás debe cruzar al cliente ni entrar en un componente marcado `"use client"`.

## Variables de entorno

Copiar `.env.example` a `.env`. `ANTHROPIC_API_KEY` es obligatoria para la extracción con IA;
el resto de la app funciona sin ella.
