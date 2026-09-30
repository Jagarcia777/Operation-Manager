-- CreateTable
CREATE TABLE "TopProductoTienda" (
    "id" TEXT NOT NULL,
    "corteId" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "posicion" INTEGER NOT NULL,
    "producto" TEXT NOT NULL,
    "ventasAprox" DOUBLE PRECISION,
    "origen" TEXT NOT NULL DEFAULT 'PDF',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopProductoTienda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TopProductoTienda_corteId_tiendaId_posicion_key" ON "TopProductoTienda"("corteId", "tiendaId", "posicion");

-- AddForeignKey
ALTER TABLE "TopProductoTienda" ADD CONSTRAINT "TopProductoTienda_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopProductoTienda" ADD CONSTRAINT "TopProductoTienda_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
