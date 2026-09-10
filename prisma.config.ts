import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7 ya no carga .env por su cuenta.
try {
  process.loadEnvFile(".env");
} catch {
  // Sin archivo .env se usan las variables del entorno.
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: { url: env("DATABASE_URL") },
  migrations: { seed: "tsx prisma/seed.ts" },
});
