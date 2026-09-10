-- CreateTable
CREATE TABLE "RegistroZona" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "corteId" TEXT NOT NULL,
    "zonaId" TEXT NOT NULL,
    "ventasMeta" REAL,
    "ventasReal" REAL,
    "unidadesMeta" REAL,
    "unidadesReal" REAL,
    "transaccionesMeta" REAL,
    "transaccionesReal" REAL,
    "margenBrutoMeta" REAL,
    "margenBrutoReal" REAL,
    "origen" TEXT NOT NULL DEFAULT 'MANUAL',
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "RegistroZona_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RegistroZona_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "RegistroCategoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "corteId" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "ventasReal" REAL,
    "unidadesReal" REAL,
    "margenBrutoReal" REAL,
    "origen" TEXT NOT NULL DEFAULT 'MANUAL',
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "RegistroCategoria_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RegistroCategoria_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RegistroCategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Zona" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "gerente" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "detallada" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Zona" ("gerente", "id", "nombre", "orden") SELECT "gerente", "id", "nombre", "orden" FROM "Zona";
DROP TABLE "Zona";
ALTER TABLE "new_Zona" RENAME TO "Zona";
CREATE UNIQUE INDEX "Zona_nombre_key" ON "Zona"("nombre");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "RegistroZona_corteId_zonaId_key" ON "RegistroZona"("corteId", "zonaId");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE INDEX "RegistroCategoria_categoriaId_idx" ON "RegistroCategoria"("categoriaId");

-- CreateIndex
CREATE INDEX "RegistroCategoria_tiendaId_idx" ON "RegistroCategoria"("tiendaId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroCategoria_corteId_tiendaId_categoriaId_key" ON "RegistroCategoria"("corteId", "tiendaId", "categoriaId");

-- La quinta tipología se llama "Ventas" en el reporte de la cadena, no "Errores de Venta".
UPDATE "RegistroAjuste" SET "tipologia" = 'VENTAS' WHERE "tipologia" = 'ERRORES_VENTA';
UPDATE "Alerta" SET "indicador" = 'VENTAS' WHERE "indicador" = 'ERRORES_VENTA';
