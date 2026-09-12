-- CreateTable
CREATE TABLE "Checklist" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "frecuencia" TEXT NOT NULL DEFAULT 'SEMANAL',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuntoChecklist" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "actividad" TEXT NOT NULL,
    "area" TEXT,
    "critico" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PuntoChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspeccion" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "corteId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsable" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "nota" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspeccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultadoPunto" (
    "id" TEXT NOT NULL,
    "inspeccionId" TEXT NOT NULL,
    "puntoId" TEXT NOT NULL,
    "cumple" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "observacion" TEXT,
    "correccion" TEXT,
    "responsable" TEXT,
    "fechaLimite" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultadoPunto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Checklist_nombre_key" ON "Checklist"("nombre");

-- CreateIndex
CREATE INDEX "PuntoChecklist_checklistId_idx" ON "PuntoChecklist"("checklistId");

-- CreateIndex
CREATE INDEX "Inspeccion_tiendaId_fecha_idx" ON "Inspeccion"("tiendaId", "fecha");

-- CreateIndex
CREATE INDEX "Inspeccion_checklistId_idx" ON "Inspeccion"("checklistId");

-- CreateIndex
CREATE INDEX "ResultadoPunto_puntoId_idx" ON "ResultadoPunto"("puntoId");

-- CreateIndex
CREATE INDEX "ResultadoPunto_estado_idx" ON "ResultadoPunto"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "ResultadoPunto_inspeccionId_puntoId_key" ON "ResultadoPunto"("inspeccionId", "puntoId");

-- AddForeignKey
ALTER TABLE "PuntoChecklist" ADD CONSTRAINT "PuntoChecklist_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspeccion" ADD CONSTRAINT "Inspeccion_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspeccion" ADD CONSTRAINT "Inspeccion_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspeccion" ADD CONSTRAINT "Inspeccion_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoPunto" ADD CONSTRAINT "ResultadoPunto_inspeccionId_fkey" FOREIGN KEY ("inspeccionId") REFERENCES "Inspeccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoPunto" ADD CONSTRAINT "ResultadoPunto_puntoId_fkey" FOREIGN KEY ("puntoId") REFERENCES "PuntoChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
