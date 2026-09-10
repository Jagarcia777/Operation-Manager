-- CreateTable
CREATE TABLE "Zona" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "gerente" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Tienda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "zonaId" TEXT NOT NULL,
    CONSTRAINT "Tienda_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Corte" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fechaInicio" DATETIME NOT NULL,
    "fechaFin" DATETIME NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "diasDelMes" INTEGER,
    "diasTranscurridos" INTEGER,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RegistroVentas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "corteId" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
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
    CONSTRAINT "RegistroVentas_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RegistroVentas_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegistroAjuste" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "corteId" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "tipologia" TEXT NOT NULL,
    "monto" REAL NOT NULL DEFAULT 0,
    "porcentaje" REAL,
    "origen" TEXT NOT NULL DEFAULT 'MANUAL',
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "RegistroAjuste_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RegistroAjuste_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "corteId" TEXT NOT NULL,
    "tiendaId" TEXT,
    "tipo" TEXT NOT NULL,
    "severidad" TEXT NOT NULL,
    "indicador" TEXT,
    "valorObservado" REAL,
    "valorEsperado" REAL,
    "mensaje" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "nota" TEXT,
    "creadaEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alerta_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Alerta_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanAccion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "alcance" TEXT NOT NULL,
    "zonaId" TEXT,
    "tiendaId" TEXT,
    "corteId" TEXT,
    "diagnostico" TEXT,
    "oportunidadUsd" REAL NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanAccion_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PlanAccion_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PlanAccion_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MetaPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "indicador" TEXT NOT NULL,
    "valorActual" REAL,
    "valorObjetivo" REAL,
    "unidad" TEXT NOT NULL DEFAULT 'USD',
    CONSTRAINT "MetaPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanAccion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HitoPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "responsable" TEXT,
    "fechaLimite" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    CONSTRAINT "HitoPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanAccion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Extraccion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "corteId" TEXT,
    "archivoNombre" TEXT NOT NULL,
    "archivoTipo" TEXT NOT NULL,
    "archivoRuta" TEXT,
    "destino" TEXT NOT NULL DEFAULT 'VENTAS',
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "modelo" TEXT,
    "respuestaCruda" TEXT,
    "error" TEXT,
    "creadaEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Extraccion_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Zona_nombre_key" ON "Zona"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Tienda_nombre_key" ON "Tienda"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Tienda_codigo_key" ON "Tienda"("codigo");

-- CreateIndex
CREATE INDEX "Tienda_zonaId_idx" ON "Tienda"("zonaId");

-- CreateIndex
CREATE UNIQUE INDEX "Corte_nombre_key" ON "Corte"("nombre");

-- CreateIndex
CREATE INDEX "RegistroVentas_tiendaId_idx" ON "RegistroVentas"("tiendaId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroVentas_corteId_tiendaId_key" ON "RegistroVentas"("corteId", "tiendaId");

-- CreateIndex
CREATE INDEX "RegistroAjuste_tiendaId_idx" ON "RegistroAjuste"("tiendaId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroAjuste_corteId_tiendaId_tipologia_key" ON "RegistroAjuste"("corteId", "tiendaId", "tipologia");

-- CreateIndex
CREATE INDEX "Alerta_corteId_estado_idx" ON "Alerta"("corteId", "estado");

-- CreateIndex
CREATE INDEX "Alerta_tiendaId_idx" ON "Alerta"("tiendaId");

-- CreateIndex
CREATE INDEX "PlanAccion_tiendaId_idx" ON "PlanAccion"("tiendaId");

-- CreateIndex
CREATE INDEX "PlanAccion_zonaId_idx" ON "PlanAccion"("zonaId");

-- CreateIndex
CREATE INDEX "MetaPlan_planId_idx" ON "MetaPlan"("planId");

-- CreateIndex
CREATE INDEX "HitoPlan_planId_idx" ON "HitoPlan"("planId");

-- CreateIndex
CREATE INDEX "Extraccion_corteId_idx" ON "Extraccion"("corteId");
