"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verificarContrasena } from "@/lib/auth-contrasena";
import { COOKIE_SESION, SEGUNDOS_SESION, crearSesion } from "@/lib/auth";

export async function entrar(formData: FormData) {
  const contrasena = String(formData.get("contrasena") ?? "");
  const hash = process.env.APP_PASSWORD_HASH;
  const secreto = process.env.SESSION_SECRET;

  if (!hash || !secreto) redirect("/entrar?error=configuracion");
  if (!contrasena || !verificarContrasena(contrasena, hash)) {
    redirect("/entrar?error=credenciales");
  }

  const almacen = await cookies();
  almacen.set(COOKIE_SESION, await crearSesion(secreto), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SEGUNDOS_SESION,
  });

  redirect("/");
}

export async function salir() {
  const almacen = await cookies();
  almacen.delete(COOKIE_SESION);
  redirect("/entrar");
}
