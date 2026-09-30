-- CreateTable
CREATE TABLE "ProductoBajoCosto" (
    "id" TEXT NOT NULL,
    "corteId" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "producto" TEXT NOT NULL,
    "origen" TEXT NOT NULL DEFAULT 'PDF',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductoBajoCosto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductoBajoCosto_corteId_codigo_idx" ON "ProductoBajoCosto"("corteId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoBajoCosto_corteId_tiendaId_codigo_key" ON "ProductoBajoCosto"("corteId", "tiendaId", "codigo");

-- AddForeignKey
ALTER TABLE "ProductoBajoCosto" ADD CONSTRAINT "ProductoBajoCosto_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoBajoCosto" ADD CONSTRAINT "ProductoBajoCosto_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
