# Operation Manager

Control de ventas y operaciones de una cadena retail de 24 tiendas en 4 zonas. Sustituye el
mantenimiento manual del Tablero de Control de Ventas y del Reporte de Ajustes por Tipología:
lee los números de cada corte, los valida, marca las inconsistencias y arma los documentos de
decisión para las reuniones de gerencia.

La aplicación corre **en tu equipo**: la base de datos es un archivo local, el servidor solo
escucha en `127.0.0.1` y no hay cuentas ni sincronización a la nube.

## Instalación

Necesitas **Node.js 20 o superior** y **git**. Para comprobar que los tienes:

```bash
node --version
git --version
```

Si falta Node, se descarga de [nodejs.org](https://nodejs.org) (versión LTS).

Después, en la terminal:

```bash
git clone https://github.com/Jagarcia777/Operation-Manager.git
cd Operation-Manager
git checkout claude/zealous-sagan-8afxve
npm install
```

## Configuración

Crea tu archivo de variables a partir de la plantilla:

```bash
cp .env.example .env
```

En Windows con PowerShell:

```powershell
Copy-Item .env.example .env
```

Abre `.env` y pega tu clave de la API de Anthropic entre las comillas:

```
ANTHROPIC_API_KEY="sk-ant-..."
```

La clave se genera en la consola de Anthropic, en la sección de API keys, y se factura por uso.
`.env` está ignorado por git, así que la clave nunca sale de tu equipo. Si alguna vez la pegas en
un chat o un correo, genera una nueva.

Sin clave la aplicación funciona igual: solo quedan desactivadas la lectura automática de
documentos y el análisis del corte.

## Puesta en marcha

```bash
npx prisma migrate deploy   # crea la base de datos local
npx prisma db seed          # carga zonas, tiendas y dos cortes de ejemplo
npm run dev                 # arranca la aplicación
```

Abre `http://127.0.0.1:3000`. Para detenerla, `Ctrl + C` en la terminal.

En los siguientes arranques basta con `npm run dev`.

## Primer uso

El seed trae 24 tiendas de relleno y dos cortes inventados, para que las pantallas no estén
vacías. Para pasar a tus datos:

1. **Configuración → Zonas y tiendas**: corrige los nombres reales de cada tienda y su zona.
2. **Configuración → Cortes**: elimina los dos cortes de ejemplo y crea el tuyo.
3. **Cargar datos**: sube el Dashboard Ejecutivo en PDF o imagen, revisa lo que leyó y confirma.
   Si prefieres teclear los números, usa la pestaña de captura manual.
4. **Alertas → Revisar corte**: busca inconsistencias en lo cargado.
5. **Análisis**: diagnóstico del corte con recomendaciones priorizadas por dinero.
6. **Documentos**: presentación de tienda e informe ejecutivo, para ver, imprimir a PDF o
   descargar en PowerPoint y Word.

## Comandos

```bash
npm run dev             # servidor de desarrollo
npm run build           # build de producción
npm run lint            # eslint
npm start               # servir el build de producción
npx prisma studio       # ver y editar la base de datos
npm run db:seed         # recargar los datos de ejemplo
```

## Documentación

- `docs/ESPECIFICACION.md` — qué hace la aplicación y por qué; es la fuente de verdad.
- `docs/ROADMAP.md` — lo construido y lo que falta.
- `CLAUDE.md` — convenciones para trabajar sobre el código.
