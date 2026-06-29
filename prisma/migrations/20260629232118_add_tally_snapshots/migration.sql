-- CreateTable
CREATE TABLE "TallySubmissionSnapshot" (
    "id" TEXT NOT NULL,
    "tallySubmissionId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "componenteId" TEXT,
    "componenteNombre" TEXT,
    "grupo" TEXT,
    "clase" TEXT,
    "fechaEnvio" TIMESTAMP(3),
    "rawJson" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TallySubmissionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyArchivoSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "tallySubmissionId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "questionId" TEXT,
    "questionLabel" TEXT,
    "tallyFileId" TEXT,
    "tallyFileName" TEXT,
    "tallyFileUrl" TEXT NOT NULL,
    "tallyMime" TEXT,
    "tallySize" INTEGER,
    "cloudinaryUrl" TEXT,
    "cloudinaryPublicId" TEXT,
    "cloudinaryMime" TEXT,
    "cloudinarySize" INTEGER,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "syncError" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TallyArchivoSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TallySubmissionSnapshot_tallySubmissionId_key" ON "TallySubmissionSnapshot"("tallySubmissionId");

-- CreateIndex
CREATE INDEX "TallySubmissionSnapshot_formId_idx" ON "TallySubmissionSnapshot"("formId");

-- CreateIndex
CREATE INDEX "TallySubmissionSnapshot_componenteId_idx" ON "TallySubmissionSnapshot"("componenteId");

-- CreateIndex
CREATE INDEX "TallySubmissionSnapshot_grupo_idx" ON "TallySubmissionSnapshot"("grupo");

-- CreateIndex
CREATE INDEX "TallySubmissionSnapshot_clase_idx" ON "TallySubmissionSnapshot"("clase");

-- CreateIndex
CREATE INDEX "TallySubmissionSnapshot_fechaEnvio_idx" ON "TallySubmissionSnapshot"("fechaEnvio");

-- CreateIndex
CREATE UNIQUE INDEX "TallyArchivoSnapshot_tallyFileUrl_key" ON "TallyArchivoSnapshot"("tallyFileUrl");

-- CreateIndex
CREATE INDEX "TallyArchivoSnapshot_tallySubmissionId_idx" ON "TallyArchivoSnapshot"("tallySubmissionId");

-- CreateIndex
CREATE INDEX "TallyArchivoSnapshot_formId_idx" ON "TallyArchivoSnapshot"("formId");

-- CreateIndex
CREATE INDEX "TallyArchivoSnapshot_questionId_idx" ON "TallyArchivoSnapshot"("questionId");

-- CreateIndex
CREATE INDEX "TallyArchivoSnapshot_syncStatus_idx" ON "TallyArchivoSnapshot"("syncStatus");

-- AddForeignKey
ALTER TABLE "TallyArchivoSnapshot" ADD CONSTRAINT "TallyArchivoSnapshot_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "TallySubmissionSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
