import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { generarDemo } from "../src/lib/demo";

try {
  process.loadEnvFile(".env");
} catch {
  // Sin archivo .env se usan las variables del entorno.
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const resumen = await generarDemo(prisma);
  console.log(
    `Demo cargado: ${resumen.tiendas} tiendas, ${resumen.cortes} cortes ` +
      `(${resumen.meses}) y ${resumen.registros} registros.`,
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
