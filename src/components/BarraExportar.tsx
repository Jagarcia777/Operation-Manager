"use client";

export function BarraExportar({
  pptxHref,
  docxHref,
}: {
  pptxHref: string;
  docxHref: string;
}) {
  return (
    <div className="no-imprimir flex flex-wrap gap-2">
      <button type="button" onClick={() => window.print()} className="boton boton-primario">
        Imprimir o guardar en PDF
      </button>
      <a href={pptxHref} className="boton boton-secundario">
        Descargar PowerPoint
      </a>
      <a href={docxHref} className="boton boton-secundario">
        Descargar Word
      </a>
    </div>
  );
}
