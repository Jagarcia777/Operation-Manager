#!/bin/bash
# Prepara el entorno al iniciar una sesión de Claude Code en la web:
# dependencias, cliente Prisma y base SQLite con datos de ejemplo.
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
  npx prisma migrate deploy
  # El seed usa upsert, así que repetirlo es seguro.
  npx prisma db seed
fi
