-- AlterTable
ALTER TABLE "RegistroAjuste" ADD COLUMN     "unidades" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "RegistroAjusteCategoria" (
    "id" TEXT NOT NULL,
    "corteId" TEXT NOT NULL,
    "tiendaId" TEXT,
    "categoriaId" TEXT NOT NULL,
    "ventas" DOUBLE PRECISION,
    "unidades" DOUBLE PRECISION,
    "monto" DOUBLE PRECISION,
    "origen" TEXT NOT NULL DEFAULT 'XLSX',
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroAjusteCategoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AjusteReferencia" (
    "id" TEXT NOT NULL,
    "corteId" TEXT NOT NULL,
    "ambito" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "zonaId" TEXT,
    "tipologia" TEXT NOT NULL DEFAULT 'TOTAL',
    "ventas" DOUBLE PRECISION,
    "unidades" DOUBLE PRECISION,
    "monto" DOUBLE PRECISION,
    "origen" TEXT NOT NULL DEFAULT 'XLSX',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AjusteReferencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroAjusteCategoria_categoriaId_idx" ON "RegistroAjusteCategoria"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroAjusteCategoria_corteId_tiendaId_categoriaId_key" ON "RegistroAjusteCategoria"("corteId", "tiendaId", "categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "AjusteReferencia_corteId_ambito_nombre_tipologia_key" ON "AjusteReferencia"("corteId", "ambito", "nombre", "tipologia");

-- AddForeignKey
ALTER TABLE "RegistroAjusteCategoria" ADD CONSTRAINT "RegistroAjusteCategoria_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAjusteCategoria" ADD CONSTRAINT "RegistroAjusteCategoria_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAjusteCategoria" ADD CONSTRAINT "RegistroAjusteCategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AjusteReferencia" ADD CONSTRAINT "AjusteReferencia_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AjusteReferencia" ADD CONSTRAINT "AjusteReferencia_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
