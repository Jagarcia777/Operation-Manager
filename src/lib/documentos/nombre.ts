/** Nombre de descarga seguro: solo lo que la app decide, sin caracteres que rompan la cabecera. */
export function nombreDeArchivo(base: string, extension: string) {
  const limpio = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
  return `${limpio || "documento"}.${extension}`;
}
