import { generarHash } from "../src/lib/auth-contrasena";

// Uso: npm run auth:hash -- "mi contraseña"
const contrasena = process.argv[2];

if (!contrasena) {
  console.error('Falta la contraseña. Uso: npm run auth:hash -- "mi contraseña"');
  process.exit(1);
}

console.log("\nPega esta línea en tu archivo .env:\n");
console.log(`APP_PASSWORD_HASH="${generarHash(contrasena)}"`);
console.log("\nY genera también un secreto de sesión distinto para cada instalación:\n");
console.log(`SESSION_SECRET="${crypto.randomUUID()}${crypto.randomUUID()}"`);
console.log("");
