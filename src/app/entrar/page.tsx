import { entrar } from "./acciones";

const MENSAJES: Record<string, string> = {
  credenciales: "Contraseña incorrecta.",
  configuracion:
    "Falta configurar APP_PASSWORD_HASH o SESSION_SECRET en el entorno. Sin eso no hay forma de validar la entrada.",
};

export default async function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  const parametros = await searchParams;
  const error = typeof parametros.error === "string" ? MENSAJES[parametros.error] : null;

  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl">Operation Manager</h1>
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
