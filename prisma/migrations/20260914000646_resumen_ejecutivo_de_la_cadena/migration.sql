-- AlterTable
ALTER TABLE "RegistroCategoria" ALTER COLUMN "tiendaId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RegistroVentas" ADD COLUMN     "precioPromedioInforme" DOUBLE PRECISION,
ADD COLUMN     "ticketPromedioInforme" DOUBLE PRECISION,
ADD COLUMN     "unidadesPorTicketInforme" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Tienda" ADD COLUMN     "comparable" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "VentaDiaria" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "ventas" DOUBLE PRECISION NOT NULL,
    "origen" TEXT NOT NULL DEFAULT 'IA',
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VentaDiaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "familia" TEXT NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroProducto" (
    "id" TEXT NOT NULL,
    "corteId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "unidades" DOUBLE PRECISION,
    "posicion" INTEGER,
    "origen" TEXT NOT NULL DEFAULT 'IA',
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroProducto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VentaDiaria_fecha_key" ON "VentaDiaria"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_nombre_key" ON "Producto"("nombre");

-- CreateIndex
CREATE INDEX "RegistroProducto_productoId_idx" ON "RegistroProducto"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroProducto_corteId_productoId_key" ON "RegistroProducto"("corteId", "productoId");

-- AddForeignKey
ALTER TABLE "RegistroProducto" ADD CONSTRAINT "RegistroProducto_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroProducto" ADD CONSTRAINT "RegistroProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
