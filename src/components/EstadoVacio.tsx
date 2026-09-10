export function EstadoVacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="tarjeta px-6 py-12 text-center">
      <p className="text-sm text-texto-2">{mensaje}</p>
    </div>
  );
}
