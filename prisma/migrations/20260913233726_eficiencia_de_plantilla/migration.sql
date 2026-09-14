-- CreateTable
CREATE TABLE "AreaOperativa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "kpi" TEXT NOT NULL,
    "estandarMin" DOUBLE PRECISION,
    "estandarMax" DOUBLE PRECISION,
    "estandar" DOUBLE PRECISION,
    "fuente" TEXT,
    "nota" TEXT,
    "usaVentaTienda" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AreaOperativa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroPlantilla" (
    "id" TEXT NOT NULL,
    "corteId" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "plantillaMeta" DOUBLE PRECISION,
    "plantillaActiva" DOUBLE PRECISION,
    "horasProgramadas" DOUBLE PRECISION,
    "horasTrabajadas" DOUBLE PRECISION,
    "horasAusentismo" DOUBLE PRECISION,
    "horasExtra" DOUBLE PRECISION,
    "ventas" DOUBLE PRECISION,
    "unidades" DOUBLE PRECISION,
    "transacciones" DOUBLE PRECISION,
    "costoNomina" DOUBLE PRECISION,
    "origen" TEXT NOT NULL DEFAULT 'MANUAL',
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroPlantilla_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AreaOperativa_nombre_key" ON "AreaOperativa"("nombre");

-- CreateIndex
CREATE INDEX "RegistroPlantilla_tiendaId_idx" ON "RegistroPlantilla"("tiendaId");

-- CreateIndex
CREATE INDEX "RegistroPlantilla_areaId_idx" ON "RegistroPlantilla"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroPlantilla_corteId_tiendaId_areaId_key" ON "RegistroPlantilla"("corteId", "tiendaId", "areaId");

-- AddForeignKey
ALTER TABLE "RegistroPlantilla" ADD CONSTRAINT "RegistroPlantilla_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroPlantilla" ADD CONSTRAINT "RegistroPlantilla_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroPlantilla" ADD CONSTRAINT "RegistroPlantilla_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AreaOperativa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
