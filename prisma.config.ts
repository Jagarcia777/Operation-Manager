import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 ya no carga .env por su cuenta.
try {
  process.loadEnvFile(".env");
} catch {
  // Sin archivo .env se usan las variables del entorno.
}

/**
 * Solo lo usan los comandos de la CLI (migrate, seed, studio); la aplicación abre su propia
 * conexión en `src/lib/db.ts`. Se prefiere la conexión directa porque las migraciones toman
 * bloqueos de sesión que un pool en modo transacción (pgbouncer, el pooler de Neon) descarta.
 */
const url =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  // `prisma generate` corre al instalar dependencias, antes de que la plataforma inyecte las
  // variables de la base: exigir la cadena aquí rompería el despliegue.
  ...(url ? { datasource: { url } } : {}),
  migrations: { seed: "tsx prisma/seed.ts" },
});
