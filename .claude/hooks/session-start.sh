#!/bin/bash
# Prepara el entorno al iniciar una sesión de Claude Code en la web:
# dependencias, cliente Prisma y, si hay una base alcanzable, migraciones y datos de ejemplo.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# .env no se versiona; se reconstruye desde la plantilla en cada contenedor nuevo.
if [ ! -f .env ]; then
  cp .env.example .env
fi

npm install --no-audit --no-fund

if [ -f prisma/schema.prisma ]; then
  npx prisma generate

  # La base es PostgreSQL y puede no existir en un contenedor recién creado. Que falte no
  # debe tumbar el arranque de la sesión: el resto del proyecto sigue siendo utilizable.
  if npx prisma migrate deploy >/dev/null 2>&1; then
    npx prisma db seed >/dev/null 2>&1 || true
    echo "Base de datos lista."
  else
    echo "Sin base de datos alcanzable. Levanta un PostgreSQL y ajusta DATABASE_URL en .env."
  fi
fi
