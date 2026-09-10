-- AlterTable
ALTER TABLE "Tienda" ADD COLUMN "ciudad" TEXT;
ALTER TABLE "Tienda" ADD COLUMN "fechaApertura" DATETIME;
ALTER TABLE "Tienda" ADD COLUMN "formato" TEXT;
ALTER TABLE "Tienda" ADD COLUMN "metrosCuadrados" REAL;

-- CreateTable
CREATE TABLE "Umbral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clave" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'PORCENTAJE',
    "nota" TEXT,
    "editado" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Perfil" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'maestro',
    "nombre" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "zonaPropiaId" TEXT,
    "contexto" TEXT,
    "instruccionesCerebro" TEXT,
    "preferencias" TEXT,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "Perfil_zonaPropiaId_fkey" FOREIGN KEY ("zonaPropiaId") REFERENCES "Zona" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotaMemoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "texto" TEXT NOT NULL,
    "etiqueta" TEXT,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "tiendaId" TEXT,
    "zonaId" TEXT,
    "corteId" TEXT,
    "creadaEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotaMemoria_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NotaMemoria_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NotaMemoria_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Umbral_clave_key" ON "Umbral"("clave");

-- CreateIndex
CREATE INDEX "Perfil_zonaPropiaId_idx" ON "Perfil"("zonaPropiaId");

-- CreateIndex
CREATE INDEX "NotaMemoria_tiendaId_idx" ON "NotaMemoria"("tiendaId");

-- CreateIndex
CREATE INDEX "NotaMemoria_zonaId_idx" ON "NotaMemoria"("zonaId");
