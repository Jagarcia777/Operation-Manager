import { Monograma } from "@/components/Monograma";
import { prisma } from "@/lib/db";
import { entrar } from "./acciones";

const MARCA_POR_DEFECTO = { nombre: "Operation Manager", iniciales: "OM" };

/**
 * La entrada debe dibujarse aunque la base no esté disponible todavía, y sobre todo rápido:
 * una base serverless que estaba dormida tarda un par de segundos en despertar, y esta es la
 * primera pantalla que ve alguien. Si no contesta a tiempo se entra con la marca por defecto;
 * el nombre real aparece en la siguiente pantalla y nadie se queda mirando un blanco.
 */
async function leerMarca() {
  const consulta = prisma.perfil
    .findUnique({ where: { id: "maestro" } })
    .then((perfil) => ({
      nombre: perfil?.marca || MARCA_POR_DEFECTO.nombre,
      iniciales: perfil?.iniciales || MARCA_POR_DEFECTO.iniciales,
    }))
    .catch(() => MARCA_POR_DEFECTO);

  const limite = new Promise<typeof MARCA_POR_DEFECTO>((resolver) =>
    setTimeout(() => resolver(MARCA_POR_DEFECTO), 1500),
  );

  return Promise.race([consulta, limite]);
}

const MENSAJES: Record<string, string> = {
  credenciales: "Contraseña incorrecta.",
  configuracion:
    "Falta configurar APP_PASSWORD_HASH o SESSION_SECRET en el entorno. Sin eso no hay forma de validar la entrada.",
};

export default async function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  const parametros = await searchParams;
  const error = typeof parametros.error === "string" ? MENSAJES[parametros.error] : null;
  const marca = await leerMarca();

  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Monograma iniciales={marca.iniciales} tamano={56} />
          <h1 className="mt-3 text-2xl">{marca.nombre}</h1>
          <p className="mt-1 text-sm text-texto-2">Control de ventas y operaciones</p>
        </div>

        <form action={entrar} className="tarjeta space-y-4 p-6">
          <label className="block text-sm">
            <span className="text-texto-2">Contraseña</span>
            <input
              type="password"
              name="contrasena"
              required
              autoFocus
              autoComplete="current-password"
              className="campo mt-1.5"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-alerta-tenue px-3 py-2 text-sm text-alerta">{error}</p>
          )}

          <button type="submit" className="boton boton-primario w-full">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
