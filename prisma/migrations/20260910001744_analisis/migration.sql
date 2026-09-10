-- CreateTable
CREATE TABLE "Analisis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "corteId" TEXT NOT NULL,
    "alcance" TEXT NOT NULL DEFAULT 'CADENA',
    "zonaId" TEXT,
    "tiendaId" TEXT,
    "contenido" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Analisis_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Analisis_corteId_alcance_idx" ON "Analisis"("corteId", "alcance");
