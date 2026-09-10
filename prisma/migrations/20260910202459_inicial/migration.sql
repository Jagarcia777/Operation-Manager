-- CreateTable
CREATE TABLE "Zona" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "gerente" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "detallada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Zona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroZona" (
    "id" TEXT NOT NULL,
    "corteId" TEXT NOT NULL,
    "zonaId" TEXT NOT NULL,
    "ventasMeta" DOUBLE PRECISION,
    "ventasReal" DOUBLE PRECISION,
    "unidadesMeta" DOUBLE PRECISION,
    "unidadesReal" DOUBLE PRECISION,
    "transaccionesMeta" DOUBLE PRECISION,
    "transaccionesReal" DOUBLE PRECISION,
    "margenBrutoMeta" DOUBLE PRECISION,
    "margenBrutoReal" DOUBLE PRECISION,
    "origen" TEXT NOT NULL DEFAULT 'MANUAL',
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroZona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tienda" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "zonaId" TEXT NOT NULL,
    "alias" TEXT,
    "ciudad" TEXT,
    "formato" TEXT,
    "metrosCuadrados" DOUBLE PRECISION,
    "fechaApertura" TIMESTAMP(3),

    CONSTRAINT "Tienda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Corte" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "diasDelMes" INTEGER,
    "diasTranscurridos" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Corte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analisis" (
    "id" TEXT NOT NULL,
    "corteId" TEXT NOT NULL,
    "alcance" TEXT NOT NULL DEFAULT 'CADENA',
    "zonaId" TEXT,
    "tiendaId" TEXT,
    "contenido" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analisis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroVentas" (
    "id" TEXT NOT NULL,
    "corteId" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "ventasMeta" DOUBLE PRECISION,
    "ventasReal" DOUBLE PRECISION,
    "unidadesMeta" DOUBLE PRECISION,
    "unidadesReal" DOUBLE PRECISION,
    "transaccionesMeta" DOUBLE PRECISION,
    "transaccionesReal" DOUBLE PRECISION,
    "margenBrutoMeta" DOUBLE PRECISION,
    "margenBrutoReal" DOUBLE PRECISION,
    "origen" TEXT NOT NULL DEFAULT 'MANUAL',
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroVentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAjuste" (
    "id" TEXT NOT NULL,
    "corteId" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "tipologia" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "porcentaje" DOUBLE PRECISION,
    "origen" TEXT NOT NULL DEFAULT 'MANUAL',
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroAjuste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroCategoria" (
    "id" TEXT NOT NULL,
    "corteId" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "ventasReal" DOUBLE PRECISION,
    "unidadesReal" DOUBLE PRECISION,
    "margenBrutoReal" DOUBLE PRECISION,
    "origen" TEXT NOT NULL DEFAULT 'MANUAL',
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroCategoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" TEXT NOT NULL,
    "corteId" TEXT NOT NULL,
    "tiendaId" TEXT,
    "tipo" TEXT NOT NULL,
    "severidad" TEXT NOT NULL,
    "indicador" TEXT,
    "valorObservado" DOUBLE PRECISION,
    "valorEsperado" DOUBLE PRECISION,
    "mensaje" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "nota" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanAccion" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "alcance" TEXT NOT NULL,
    "zonaId" TEXT,
    "tiendaId" TEXT,
    "corteId" TEXT,
    "diagnostico" TEXT,
    "oportunidadUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanAccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaPlan" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "indicador" TEXT NOT NULL,
    "valorActual" DOUBLE PRECISION,
    "valorObjetivo" DOUBLE PRECISION,
    "unidad" TEXT NOT NULL DEFAULT 'USD',

    CONSTRAINT "MetaPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HitoPlan" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "responsable" TEXT,
    "fechaLimite" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "HitoPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Umbral" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'PORCENTAJE',
    "nota" TEXT,
    "editado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Umbral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benchmark" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "valor" DOUBLE PRECISION,
    "unidad" TEXT NOT NULL DEFAULT 'PORCENTAJE',
    "fuente" TEXT NOT NULL DEFAULT 'Interno',
    "nota" TEXT,
    "editado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Benchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Perfil" (
    "id" TEXT NOT NULL DEFAULT 'maestro',
    "nombre" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "zonaPropiaId" TEXT,
    "marca" TEXT,
    "iniciales" TEXT,
    "contexto" TEXT,
    "instruccionesCerebro" TEXT,
    "preferencias" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaMemoria" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "etiqueta" TEXT,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "tiendaId" TEXT,
    "zonaId" TEXT,
    "corteId" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotaMemoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Extraccion" (
    "id" TEXT NOT NULL,
    "corteId" TEXT,
    "archivoNombre" TEXT NOT NULL,
    "archivoTipo" TEXT NOT NULL,
    "archivoRuta" TEXT,
    "destino" TEXT NOT NULL DEFAULT 'VENTAS',
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "modelo" TEXT,
    "respuestaCruda" TEXT,
    "error" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Extraccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Zona_nombre_key" ON "Zona"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroZona_corteId_zonaId_key" ON "RegistroZona"("corteId", "zonaId");

-- CreateIndex
CREATE UNIQUE INDEX "Tienda_nombre_key" ON "Tienda"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Tienda_codigo_key" ON "Tienda"("codigo");

-- CreateIndex
CREATE INDEX "Tienda_zonaId_idx" ON "Tienda"("zonaId");

-- CreateIndex
CREATE UNIQUE INDEX "Corte_nombre_key" ON "Corte"("nombre");

-- CreateIndex
CREATE INDEX "Analisis_corteId_alcance_idx" ON "Analisis"("corteId", "alcance");

-- CreateIndex
CREATE INDEX "RegistroVentas_tiendaId_idx" ON "RegistroVentas"("tiendaId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroVentas_corteId_tiendaId_key" ON "RegistroVentas"("corteId", "tiendaId");

-- CreateIndex
CREATE INDEX "RegistroAjuste_tiendaId_idx" ON "RegistroAjuste"("tiendaId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroAjuste_corteId_tiendaId_tipologia_key" ON "RegistroAjuste"("corteId", "tiendaId", "tipologia");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE INDEX "RegistroCategoria_categoriaId_idx" ON "RegistroCategoria"("categoriaId");

-- CreateIndex
CREATE INDEX "RegistroCategoria_tiendaId_idx" ON "RegistroCategoria"("tiendaId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroCategoria_corteId_tiendaId_categoriaId_key" ON "RegistroCategoria"("corteId", "tiendaId", "categoriaId");

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
CREATE UNIQUE INDEX "Umbral_clave_key" ON "Umbral"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "Benchmark_clave_key" ON "Benchmark"("clave");

-- CreateIndex
CREATE INDEX "Perfil_zonaPropiaId_idx" ON "Perfil"("zonaPropiaId");

-- CreateIndex
CREATE INDEX "NotaMemoria_tiendaId_idx" ON "NotaMemoria"("tiendaId");

-- CreateIndex
CREATE INDEX "NotaMemoria_zonaId_idx" ON "NotaMemoria"("zonaId");

-- CreateIndex
CREATE INDEX "Extraccion_corteId_idx" ON "Extraccion"("corteId");

-- AddForeignKey
ALTER TABLE "RegistroZona" ADD CONSTRAINT "RegistroZona_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroZona" ADD CONSTRAINT "RegistroZona_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tienda" ADD CONSTRAINT "Tienda_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analisis" ADD CONSTRAINT "Analisis_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroVentas" ADD CONSTRAINT "RegistroVentas_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroVentas" ADD CONSTRAINT "RegistroVentas_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAjuste" ADD CONSTRAINT "RegistroAjuste_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAjuste" ADD CONSTRAINT "RegistroAjuste_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroCategoria" ADD CONSTRAINT "RegistroCategoria_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroCategoria" ADD CONSTRAINT "RegistroCategoria_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroCategoria" ADD CONSTRAINT "RegistroCategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAccion" ADD CONSTRAINT "PlanAccion_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAccion" ADD CONSTRAINT "PlanAccion_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAccion" ADD CONSTRAINT "PlanAccion_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaPlan" ADD CONSTRAINT "MetaPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanAccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HitoPlan" ADD CONSTRAINT "HitoPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanAccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Perfil" ADD CONSTRAINT "Perfil_zonaPropiaId_fkey" FOREIGN KEY ("zonaPropiaId") REFERENCES "Zona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaMemoria" ADD CONSTRAINT "NotaMemoria_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "Tienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaMemoria" ADD CONSTRAINT "NotaMemoria_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaMemoria" ADD CONSTRAINT "NotaMemoria_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Extraccion" ADD CONSTRAINT "Extraccion_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE SET NULL ON UPDATE CASCADE;
