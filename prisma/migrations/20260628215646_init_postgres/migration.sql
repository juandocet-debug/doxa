-- CreateTable
CREATE TABLE "Meta" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Componente" (
    "id" TEXT NOT NULL,
    "metaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Componente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accion" (
    "id" TEXT NOT NULL,
    "componenteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "requiereInstancia" BOOLEAN NOT NULL DEFAULT false,
    "tipoInstancia" TEXT,
    "cantidadInstancias" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Accion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstanciaAccion" (
    "id" TEXT NOT NULL,
    "accionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "numero" INTEGER,
    "tipo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstanciaAccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenciaRequerida" (
    "id" TEXT NOT NULL,
    "accionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoArchivo" TEXT NOT NULL DEFAULT 'foto',
    "multiple" BOOLEAN NOT NULL DEFAULT true,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenciaRequerida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registro" (
    "id" TEXT NOT NULL,
    "metaId" TEXT NOT NULL,
    "componenteId" TEXT NOT NULL,
    "accionId" TEXT NOT NULL,
    "instanciaAccionId" TEXT,
    "fechaActividad" TIMESTAMP(3) NOT NULL,
    "responsable" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "localidad" TEXT,
    "lugar" TEXT,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Registro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenciaCargada" (
    "id" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "evidenciaRequeridaId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "observacionRevision" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenciaCargada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyFormulario" (
    "id" TEXT NOT NULL,
    "componenteId" TEXT NOT NULL,
    "tallyFormId" TEXT NOT NULL,
    "tallyFormUrl" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyFormulario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchivoEvidencia" (
    "id" TEXT NOT NULL,
    "evidenciaCargadaId" TEXT NOT NULL,
    "nombreOriginal" TEXT NOT NULL,
    "nombreAlmacenado" TEXT NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "tipoMime" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "peso" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivoEvidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AprobacionTally" (
    "id" TEXT NOT NULL,
    "tallySubmissionId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AprobacionTally_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Componente_metaId_idx" ON "Componente"("metaId");

-- CreateIndex
CREATE INDEX "Accion_componenteId_idx" ON "Accion"("componenteId");

-- CreateIndex
CREATE INDEX "InstanciaAccion_accionId_idx" ON "InstanciaAccion"("accionId");

-- CreateIndex
CREATE INDEX "EvidenciaRequerida_accionId_idx" ON "EvidenciaRequerida"("accionId");

-- CreateIndex
CREATE INDEX "Registro_metaId_idx" ON "Registro"("metaId");

-- CreateIndex
CREATE INDEX "Registro_componenteId_idx" ON "Registro"("componenteId");

-- CreateIndex
CREATE INDEX "Registro_accionId_idx" ON "Registro"("accionId");

-- CreateIndex
CREATE INDEX "Registro_instanciaAccionId_idx" ON "Registro"("instanciaAccionId");

-- CreateIndex
CREATE INDEX "Registro_estado_idx" ON "Registro"("estado");

-- CreateIndex
CREATE INDEX "Registro_createdBy_idx" ON "Registro"("createdBy");

-- CreateIndex
CREATE INDEX "EvidenciaCargada_registroId_idx" ON "EvidenciaCargada"("registroId");

-- CreateIndex
CREATE INDEX "EvidenciaCargada_estado_idx" ON "EvidenciaCargada"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "TallyFormulario_componenteId_key" ON "TallyFormulario"("componenteId");

-- CreateIndex
CREATE UNIQUE INDEX "TallyFormulario_tallyFormId_key" ON "TallyFormulario"("tallyFormId");

-- CreateIndex
CREATE INDEX "TallyFormulario_componenteId_idx" ON "TallyFormulario"("componenteId");

-- CreateIndex
CREATE INDEX "ArchivoEvidencia_evidenciaCargadaId_idx" ON "ArchivoEvidencia"("evidenciaCargadaId");

-- CreateIndex
CREATE UNIQUE INDEX "AprobacionTally_tallySubmissionId_key" ON "AprobacionTally"("tallySubmissionId");

-- CreateIndex
CREATE INDEX "AprobacionTally_formId_idx" ON "AprobacionTally"("formId");

-- CreateIndex
CREATE INDEX "AprobacionTally_estado_idx" ON "AprobacionTally"("estado");

-- AddForeignKey
ALTER TABLE "Componente" ADD CONSTRAINT "Componente_metaId_fkey" FOREIGN KEY ("metaId") REFERENCES "Meta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accion" ADD CONSTRAINT "Accion_componenteId_fkey" FOREIGN KEY ("componenteId") REFERENCES "Componente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstanciaAccion" ADD CONSTRAINT "InstanciaAccion_accionId_fkey" FOREIGN KEY ("accionId") REFERENCES "Accion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaRequerida" ADD CONSTRAINT "EvidenciaRequerida_accionId_fkey" FOREIGN KEY ("accionId") REFERENCES "Accion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registro" ADD CONSTRAINT "Registro_metaId_fkey" FOREIGN KEY ("metaId") REFERENCES "Meta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registro" ADD CONSTRAINT "Registro_componenteId_fkey" FOREIGN KEY ("componenteId") REFERENCES "Componente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registro" ADD CONSTRAINT "Registro_accionId_fkey" FOREIGN KEY ("accionId") REFERENCES "Accion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registro" ADD CONSTRAINT "Registro_instanciaAccionId_fkey" FOREIGN KEY ("instanciaAccionId") REFERENCES "InstanciaAccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaCargada" ADD CONSTRAINT "EvidenciaCargada_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "Registro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaCargada" ADD CONSTRAINT "EvidenciaCargada_evidenciaRequeridaId_fkey" FOREIGN KEY ("evidenciaRequeridaId") REFERENCES "EvidenciaRequerida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TallyFormulario" ADD CONSTRAINT "TallyFormulario_componenteId_fkey" FOREIGN KEY ("componenteId") REFERENCES "Componente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivoEvidencia" ADD CONSTRAINT "ArchivoEvidencia_evidenciaCargadaId_fkey" FOREIGN KEY ("evidenciaCargadaId") REFERENCES "EvidenciaCargada"("id") ON DELETE CASCADE ON UPDATE CASCADE;
