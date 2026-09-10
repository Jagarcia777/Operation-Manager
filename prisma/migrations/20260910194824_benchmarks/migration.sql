-- CreateTable
CREATE TABLE "Benchmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clave" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "valor" REAL,
    "unidad" TEXT NOT NULL DEFAULT 'PORCENTAJE',
    "fuente" TEXT NOT NULL DEFAULT 'Interno',
    "nota" TEXT,
    "editado" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Benchmark_clave_key" ON "Benchmark"("clave");
