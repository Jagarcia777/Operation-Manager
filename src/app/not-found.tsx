import Link from "next/link";

export default function NoEncontrado() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="tarjeta max-w-md p-7 text-center">
        <p className="text-4xl font-semibold tracking-[-0.03em] text-texto-3">404</p>
        <h1 className="mt-2 text-lg">Esta página no existe</h1>
        <p className="mt-2 text-sm text-texto-2">
          Puede que el enlace esté viejo o que el corte al que apuntaba ya no esté cargado.
        </p>
        <Link href="/" className="boton boton-primario mt-5">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
