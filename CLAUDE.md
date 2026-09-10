# Operation Manager

Herramienta interna de control de ventas y operaciones para una cadena retail de **24 tiendas
en 4 zonas**. Sustituye el mantenimiento manual del Tablero de Control de Ventas y del Reporte
de Ajustes por Tipología: ingesta los números de cada corte, los valida, detecta inconsistencias
y genera los documentos de decisión (presentaciones de tienda, informes ejecutivos, planes de acción).

Requisitos completos: `docs/ESPECIFICACION.md` — es la fuente de verdad, no re-derivar desde cero.
Estado y fases: `docs/ROADMAP.md` — actualizar las casillas al terminar cada bloque.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Prisma + SQLite (`prisma/dev.db`)
- `@anthropic-ai/sdk` para la extracción de PDF/imagen (`claude-opus-5`)
- `pptxgenjs` / `docx` para exportar PowerPoint y Word

## Comandos

```bash
npm run dev             # servidor de desarrollo
npm run build           # build de producción (verificación obligatoria antes de commit)
npm run lint            # eslint
npx prisma migrate dev  # crear/aplicar migración tras editar el schema
npx prisma db seed      # cargar zonas, tiendas y datos de ejemplo
npx prisma studio       # inspeccionar la base de datos
```

## Mapa del repo

```
prisma/schema.prisma      modelo de datos (dominio en español)
prisma/seed.ts            zonas, 24 tiendas y corte de ejemplo
src/app/                  rutas App Router (una carpeta por módulo)
src/app/api/              route handlers (extracción IA, exportaciones)
src/lib/db.ts             singleton de PrismaClient
src/lib/calculos.ts       KPIs derivados, subtotales por zona, proyección, aportes
src/lib/validacion.ts     motor de alertas (nunca corrige, solo marca)
src/lib/analisis/         cerebro analítico: evidencia determinista + asesoría con IA
src/lib/extraccion/       ingesta con IA de PDF/imagen
src/lib/documentos/       generación de PPTX/DOCX
src/components/           componentes compartidos de UI
```

## Convenciones

- **Vocabulario del dominio en español** en modelos, campos, rutas y UI (`Tienda`, `Corte`,
  `Merma`, `Meta`/`Real`). El andamiaje técnico genérico va en inglés. No traducir términos
  del negocio: "Activo" es el valor real ejecutado, no un booleano.
- **SQLite no soporta enums ni Json en Prisma**: usar `String` y declarar las uniones en
  `src/lib/dominio.ts` (constantes + tipos TS). Los payloads JSON se guardan como texto.
- **Los subtotales y totales nunca se capturan**: se calculan siempre desde el detalle por
  tienda. Si una fuente externa trae un subtotal, se compara y se levanta una alerta si difiere.
- **La app nunca corrige datos en silencio.** Toda inconsistencia se registra como `Alerta`
  con su explicación y queda para que una persona confirme o descarte.
- Todo dato extraído por IA entra como *propuesta*: requiere revisión humana antes de guardarse.
- **El cerebro analítico interpreta, no calcula.** Las cifras se derivan siempre en
  `src/lib/calculos.ts`; el modelo recibe esa evidencia ya calculada y aporta diagnóstico,
  estimación y recomendaciones con criterio de director de operaciones retail
  (`docs/ESPECIFICACION.md` §2.8). Nunca se le pide que invente o recalcule números.
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

## Variables de entorno

Copiar `.env.example` a `.env`. `ANTHROPIC_API_KEY` es obligatoria para la extracción con IA;
el resto de la app funciona sin ella.
