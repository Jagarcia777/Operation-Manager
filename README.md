# Operation Manager

Control de ventas y operaciones de **Zona Oriente de Rio Supermarket**: 6 tiendas gestionadas al
detalle, medidas contra la cadena nacional. Sustituye el mantenimiento manual del Tablero de
Control de Ventas y del Reporte de Ajustes por Tipología: lee los números de cada corte, los
valida, marca las inconsistencias y arma los documentos de decisión para las reuniones de gerencia.

## Requisitos

- **Node.js 20** o superior
- **PostgreSQL**, propio o de un proveedor (Neon, Supabase, Railway…)
- **git**

Para comprobar lo que ya tienes:

```bash
node --version
git --version
```

## Instalación

```bash
git clone https://github.com/Jagarcia777/Operation-Manager.git
cd Operation-Manager
git checkout claude/zealous-sagan-8afxve
npm install
```

## Configuración

Crea tu archivo de variables a partir de la plantilla:

```bash
cp .env.example .env          # en PowerShell: Copy-Item .env.example .env
```

Genera la contraseña de acceso y el secreto de sesión:

```bash
npm run auth:hash -- "tu contraseña"
```

Ese comando imprime dos líneas, `APP_PASSWORD_HASH` y `SESSION_SECRET`. Pégalas en `.env` junto a
la cadena de conexión de tu base y, si vas a usar la lectura con IA, tu clave de Anthropic:

```
DATABASE_URL="postgresql://usuario:clave@host:5432/operation_manager"
APP_PASSWORD_HASH="scrypt:..."
SESSION_SECRET="..."
ANTHROPIC_API_KEY="sk-ant-..."
```

`.env` está ignorado por git, así que nada de eso sale de tu equipo. Si alguna vez pegas la clave
en un chat o un correo, genera una nueva.

Sin `ANTHROPIC_API_KEY` la aplicación funciona igual: solo quedan desactivadas la lectura
automática de documentos y el análisis del corte.

## Puesta en marcha

```bash
npx prisma migrate deploy   # crea las tablas
npm run db:seed             # catálogo de Zona Oriente y datos de ejemplo
npm run dev                 # arranca en http://127.0.0.1:3000
```

En los siguientes arranques basta con `npm run dev`. Para detenerla, `Ctrl + C`.

## Primer uso

El seed trae el catálogo real de Zona Oriente con cifras inventadas, para que las pantallas no
estén vacías. Para pasar a tus datos:

1. **Configuración → Perfil**: tu marca y monograma.
2. **Configuración → Zonas y tiendas**: nombra las cinco zonas de comparación y revisa los alias.
3. **Configuración → Benchmarks**: carga tus referencias de margen, RPT, UPT, ASP y merma.
4. **Configuración → Cortes**: elimina los cortes de ejemplo y crea el tuyo.
5. **Cargar datos**: sube el Dashboard Ejecutivo en PDF o imagen, revisa lo leído y confirma. Si
   prefieres teclear los números, usa la pestaña de captura manual.
6. **Alertas → Revisar corte**: busca inconsistencias en lo cargado.
7. **Análisis**: diagnóstico con recomendaciones priorizadas por dinero.
8. **Documentos**: informe ejecutivo y presentación de tienda, para ver, imprimir a PDF o
   descargar en PowerPoint y Word.

## Despliegue en Vercel

1. **Crea la base de datos.** En Neon o Supabase, crea un proyecto PostgreSQL y copia la cadena
   de conexión. Si el proveedor ofrece una URL *con pool* (pooled / pgbouncer), usa esa: en un
   entorno serverless cada petición puede abrir su propia conexión y sin pool se agotan.
2. **Sube el repositorio a GitHub** e impórtalo en Vercel.
3. **Configura las variables de entorno** en el proyecto de Vercel: `DATABASE_URL`,
   `APP_PASSWORD_HASH`, `SESSION_SECRET` y, si vas a usar la lectura con IA, `ANTHROPIC_API_KEY`.
   Genera las dos primeras con `npm run auth:hash`.
4. **Despliega.** El script `vercel-build` aplica las migraciones y compila, así que la base queda
   al día en cada despliegue sin pasos manuales.
5. **Carga el catálogo** la primera vez, apuntando a la base de producción desde tu equipo:
   `npm run db:seed`.

Tres cosas que conviene no pasar por alto:

- **Sirve siempre por HTTPS.** La cookie de sesión se marca `secure` en producción y sin TLS no
  viaja; Vercel da HTTPS por defecto, pero si algún día montas en un servidor propio hay que
  configurarlo.
- **`SESSION_SECRET` distinto en cada instalación.** Quien lo tenga puede fabricar sesiones válidas.
- **La base guarda ventas, márgenes y mermas de la cadena.** Elige un proveedor con cifrado en
  reposo y copias de seguridad, y no compartas la cadena de conexión.

Los documentos que subes se guardan en la base y no en disco, porque en Vercel el sistema de
archivos es de solo lectura y se reinicia en cada despliegue.

Tres cosas que conviene no pasar por alto:

- **Sirve siempre por HTTPS.** La cookie de sesión se marca `secure` en producción y sin TLS no
  viaja, así que la aplicación quedaría inaccesible.
- **`SESSION_SECRET` distinto en cada instalación.** Quien lo tenga puede fabricar sesiones válidas.
- **La base guarda ventas, márgenes y mermas de la cadena.** Elige un proveedor con cifrado en
  reposo y copias de seguridad, y no compartas la cadena de conexión.

## Comandos

```bash
npm run dev             # servidor de desarrollo
npm run build           # build de producción
npm run lint            # eslint
npm start               # servir el build de producción
npm run auth:hash       # generar contraseña y secreto de sesión
npm run db:seed         # recargar el catálogo y los datos de ejemplo
npm run db:reset        # recrear la base desde cero
npx prisma studio       # ver y editar la base
```

## Documentación

- `docs/ESPECIFICACION.md` — qué hace la aplicación y por qué; es la fuente de verdad.
- `docs/ROADMAP.md` — lo construido y lo que falta.
- `CLAUDE.md` — convenciones para trabajar sobre el código.
