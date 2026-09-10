# Especificación funcional — Operation Manager

Fuente de verdad del producto. Recoge el proceso manual que hoy se ejecuta corte a corte y que
la aplicación debe automatizar.

## 1. Contexto operativo

- Cadena de **24 tiendas** agrupadas en **4 zonas**; cada zona tiene un gerente:
  Milagros Velásquez, Gerardo Gómez, José Peña, José García.
- La información entra por **cortes**: semanales y de cierre de mes.
- La fuente actual es el **Dashboard Ejecutivo** que llega en PDF o imagen.
- Los nombres reales de las tiendas se administran desde la app (una es "Tipuro"); el seed
  carga marcadores editables mientras no esté el listado definitivo.

## 2. Módulos

### 2.1 Tablero de Control de Ventas

Indicadores por tienda y corte:

| Indicador | Notas |
| --- | --- |
| Ventas $ | Meta y Real |
| Unidades | Meta y Real |
| Transacciones | Meta y Real |
| %MB | Margen bruto, Meta y Real |
| Ticket Promedio | Derivado: Ventas $ / Transacciones |

- Vista agrupada por zona, con **subtotal por zona** y **total de cadena**, ambos calculados.
- Cumplimiento = Real / Meta, por indicador, tienda, zona y cadena.
- Comparativo contra el corte anterior.

### 2.2 Proyección de cierre de mes

Proyecta el cierre a partir del ritmo acumulado del mes en curso (días transcurridos frente a
días del mes), por tienda, zona y cadena, contra la meta mensual. Señala qué tiendas cierran
por debajo de meta y cuánto falta en $.

### 2.3 Consolidado de Aportes

Aporte de cada tienda y cada zona al total de la cadena (% de participación en ventas, unidades
y margen), ordenado y con acumulado, para ver quién sostiene el resultado.

### 2.4 Reporte de Ajustes por Tipología

Cinco tipologías, por tienda y corte, en monto y en % sobre ventas:

1. Merma
2. Mercancía Dañada
3. Carga y Descarga
4. Inventario
5. Errores de Venta

Agrupado por zona con subtotales, para ubicar dónde se pierde dinero y de qué forma.

### 2.5 Motor de validación y alertas

**Principio rector: la aplicación nunca corrige datos en silencio.** Marca, explica y espera
confirmación humana. Reglas:

| Regla | Qué detecta |
| --- | --- |
| Subtotal descuadrado | Un subtotal traído de la fuente no coincide con la suma de sus tiendas |
| Meta/Real intercambiados | Cumplimientos absurdos que sugieren campos invertidos entre sí o entre tiendas |
| Valor atípico | Valor fuera del rango típico de su zona/cadena (caso real: Carga y Descarga de +2.38% en Tipuro) |
| Dato faltante | Tienda sin registro, o indicador vacío, en un corte |
| Salto imposible | Variación contra el corte anterior fuera de rango razonable |

Cada alerta guarda tienda, indicador, valor observado, valor esperado, explicación y estado
(abierta / revisada / descartada).

### 2.6 Documentos de decisión

- **Presentación de tienda** para reuniones de gerencia: diagnóstico (KPIs vs meta, posición en
  su zona, ajustes por tipología) más plan de acción.
- **Informe ejecutivo**: hallazgos del corte y comparativo entre zonas.
- **Planes de acción**, transversales (toda la cadena o una zona) o individualizados por tienda,
  con **metas cuantificadas**, **cronograma a 3 meses** y **$ de oportunidad**.

Salida: vista en la app e impresión a PDF para el uso común; además exportación descargable a
**PowerPoint (.pptx)** y **Word (.docx)**.

### 2.7 Ingesta con IA

Se sube el Dashboard Ejecutivo (PDF o imagen) y el modelo extrae la tabla por tienda.

- Modelo `claude-opus-5` vía `@anthropic-ai/sdk`, salida estructurada validada contra esquema.
- Lo extraído se muestra en una **pantalla de revisión** contra el detalle capturado: nada se
  guarda sin confirmación.
- Cada tienda leída se empareja por nombre con el catálogo; lo no emparejado se marca.
- Se conserva el archivo de origen y la respuesta cruda para auditoría.
- La captura manual y la importación CSV quedan disponibles como respaldo.

### 2.8 Cerebro analítico — perspectiva de director de operaciones

La aplicación no se limita a mostrar números: los interpreta con el criterio de un **director de
operaciones retail** —crítico, eficiente y preciso— que domina los fundamentos clásicos del oficio
y las tendencias actuales, y que analiza tanto lo técnico como lo cualitativo.

**Análisis técnico (determinista, calculado por la app):**

- Cumplimiento vs meta por indicador, tienda, zona y cadena; brecha expresada en $.
- Ticket promedio, unidades por transacción (UPT) y mezcla de margen.
- Aporte y concentración: qué tiendas sostienen realmente el resultado de la cadena.
- Ajustes por tipología como % de ventas, contra la mediana de su zona y de la cadena.
- Tendencia contra el corte anterior y proyección de cierre.
- Valor de la brecha: cuánto vale en $ cerrar cada desviación.

**Lectura cualitativa (interpretación del modelo):**

- Distingue causa raíz de síntoma: una caída de ticket promedio no es lo mismo que una caída de
  tráfico, y cada una lleva a un plan distinto.
- Cruza indicadores: margen que sube mientras las unidades caen, merma alta junto a inventario
  descuadrado, transacciones estables con ticket en descenso.
- Traduce el diagnóstico en acciones ejecutables en tienda, priorizadas por impacto en $.
- Declara explícitamente lo que no puede concluir con los datos disponibles.

**Estimar y aconsejar:**

- Proyección de cierre y escenarios (piso, esperado, techo) con los supuestos a la vista.
- Recomendaciones ordenadas por $ de oportunidad y esfuerzo de ejecución.
- Borrador de plan de acción con metas cuantificadas, responsable sugerido y cronograma a 3 meses.

**Reglas del cerebro:**

- Las cifras salen siempre del motor de cálculo determinista. El modelo interpreta; no inventa
  números ni los recalcula por su cuenta.
- Cada recomendación se ancla a su evidencia: indicador, tienda y corte.
- Ante datos insuficientes o sospechosos lo dice, apoyándose en las alertas del motor de validación.
- El criterio es crítico: si un buen resultado esconde un problema, lo señala.

## 3. Un solo usuario: José García

La aplicación tiene un **único usuario maestro**: José García, que dirige operaciones y además es
gerente de una de las cuatro zonas. No hay login, roles ni permisos; todo el sistema se acopla a él.

- El **perfil** (`Perfil`, fila única `maestro`) guarda su cargo, su zona, el contexto de su forma
  de trabajar y las instrucciones que quiere que siga el cerebro analítico.
- La **memoria operativa** (`NotaMemoria`) recoge lo que él sabe y la data no dice —una tienda con
  el depósito en obra, un gerente recién nombrado, una promoción local— y ese contexto entra en los
  análisis siguientes. Es lo que hace que la herramienta mejore con el uso en lugar de empezar de
  cero cada corte.
- Los **umbrales** del motor de alertas (`Umbral`) son suyos y se editan desde la app.

## 4. Escalabilidad

La cadena está en crecimiento, así que nada del dominio vive fijo en el código:

- Zonas y tiendas son datos, no constantes: sumar una tienda o una zona es una operación de
  catálogo, sin tocar el tablero ni los cálculos.
- `Tienda.fechaApertura` permite aislar las tiendas nuevas del comparativo (**ventas comparables**),
  única forma de leer el crecimiento real sin que las aperturas distorsionen la cadena.
- `Tienda.metrosCuadrados` y `Tienda.formato` habilitan productividad por m² y comparaciones entre
  tiendas parecidas, en vez de medir una tienda grande contra una pequeña.
- Los umbrales de alerta son configurables: lo que hoy es atípico deja de serlo cuando la cadena
  cambia de escala.
- La base es SQLite por simplicidad. Con Prisma 7 y adaptadores de driver, migrar a PostgreSQL
  cuando el volumen lo pida es un cambio de configuración, no de código de negocio.

### Ideas propuestas (pendientes de aprobación)

| Idea | Por qué aportaría |
| --- | --- |
| Registrar el resultado de cada plan de acción | Cierra el ciclo: permite saber qué acciones movieron de verdad el número y que el cerebro recomiende sobre lo que funcionó en esta cadena, no sobre teoría |
| Catálogo de acciones (playbook) por tipo de problema | Evita reescribir el mismo plan cada mes y estandariza la ejecución en las 24 tiendas |
| Vista de ventas comparables | Separa el crecimiento real del crecimiento por aperturas |
| Productividad por m² y por hora-hombre | Dos indicadores clásicos que hoy faltan y que explican buena parte de la brecha entre tiendas |
| Pantalla de inicio por excepción | Gestión por excepción: ver primero lo que se salió de rango, no las 24 tiendas en orden |

## 5. Seguridad y privacidad

La información del negocio es sensible, así que el sistema corre **en el entorno del usuario** y
no delega sus datos a servicios de terceros.

- **Todo es local**: la aplicación se ejecuta en su equipo y la base de datos es un archivo suyo
  (`prisma/dev.db`). No hay servidor compartido, ni cuentas, ni sincronización a la nube.
- **Solo escucha en localhost**: `npm run dev` y `npm start` se atan a `127.0.0.1`, de modo que la
  app no queda expuesta a la red local.
- **Sin recursos de terceros**: tipografías del sistema, nada de CDN ni fuentes remotas, y una
  política de contenido (CSP) que restringe la app a su propio origen. Sin analítica. La telemetría
  anónima que Next.js trae activada de fábrica se desactiva sola al instalar (`postinstall`), para
  que la promesa no dependa de acordarse de un comando.
- **La única salida a internet es la IA, y es explícita**: la extracción del PDF/imagen y la
  asesoría del cerebro analítico usan la API de Anthropic con la clave del propio usuario, por
  TLS. Se envía únicamente el archivo a leer o las métricas ya calculadas del corte —nunca la base
  completa— y esas funciones quedan inactivas si no hay clave configurada. El resto de la
  aplicación funciona sin conexión.
- **Credenciales fuera del repositorio**: la clave vive en `.env`, que está ignorado por git, y se
  usa solo del lado del servidor; nunca llega al navegador.
- **Archivos cargados**: los PDF/imágenes originales se guardan localmente en una carpeta ignorada
  por git y pueden borrarse desde la app.

## 6. Fuera de alcance por ahora

- Autenticación y multiusuario: el sistema es de un solo usuario maestro por diseño.
- Integración directa con el sistema transaccional de las tiendas.
