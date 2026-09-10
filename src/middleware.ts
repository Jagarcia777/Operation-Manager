import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/auth";

// Todo queda detrás de la sesión salvo la pantalla de entrada y los recursos estáticos.
export async function middleware(request: NextRequest) {
  const valida = await sesionValida(
    request.cookies.get(COOKIE_SESION)?.value,
    process.env.SESSION_SECRET,
  );
  if (valida) return NextResponse.next();

  const entrada = new URL("/entrar", request.url);
  return NextResponse.redirect(entrada);
}

export const config = {
  matcher: ["/((?!entrar|_next/static|_next/image|favicon.ico).*)"],
};
