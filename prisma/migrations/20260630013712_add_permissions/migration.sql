-- CreateTable
CREATE TABLE "TallyDeletedSubmission" (
    "id" TEXT NOT NULL,
    "tallySubmissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyDeletedSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoxaUsuario" (
    "id" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "documento" TEXT,
    "rolBase" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoxaUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoxaPermisoComponente" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "componenteId" TEXT NOT NULL,
    "puedeVer" BOOLEAN NOT NULL DEFAULT false,
    "puedeAprobar" BOOLEAN NOT NULL DEFAULT false,
    "puedeDevolver" BOOLEAN NOT NULL DEFAULT false,
    "puedeReemplazar" BOOLEAN NOT NULL DEFAULT false,
    "puedeSincronizarBackup" BOOLEAN NOT NULL DEFAULT false,
    "puedeExportar" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DoxaPermisoComponente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoxaAuditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "componenteId" TEXT,
    "formId" TEXT,
    "tallySubmissionId" TEXT,
    "clase" TEXT,
    "grupo" TEXT,
    "estadoAnterior" TEXT,
    "estadoNuevo" TEXT,
    "detalle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoxaAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TallyDeletedSubmission_tallySubmissionId_key" ON "TallyDeletedSubmission"("tallySubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "DoxaUsuario_externalUserId_key" ON "DoxaUsuario"("externalUserId");

-- CreateIndex
CREATE INDEX "DoxaPermisoComponente_componenteId_idx" ON "DoxaPermisoComponente"("componenteId");

-- CreateIndex
CREATE UNIQUE INDEX "DoxaPermisoComponente_usuarioId_componenteId_key" ON "DoxaPermisoComponente"("usuarioId", "componenteId");

-- AddForeignKey
ALTER TABLE "DoxaPermisoComponente" ADD CONSTRAINT "DoxaPermisoComponente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "DoxaUsuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoxaAuditoria" ADD CONSTRAINT "DoxaAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "DoxaUsuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
