-- CreateTable
CREATE TABLE "EvidenciaTallyReemplazo" (
    "id" TEXT NOT NULL,
    "tallySubmissionId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "questionId" TEXT,
    "tallyFileUrl" TEXT NOT NULL,
    "tallyFileName" TEXT,
    "replacementUrl" TEXT NOT NULL,
    "replacementPublicId" TEXT,
    "replacementName" TEXT,
    "replacementMime" TEXT,
    "replacementSize" INTEGER,
    "storageProvider" TEXT NOT NULL DEFAULT 'cloudinary',
    "motivo" TEXT NOT NULL,
    "replacedBy" TEXT,
    "replacedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EvidenciaTallyReemplazo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenciaTallyReemplazo_tallySubmissionId_idx" ON "EvidenciaTallyReemplazo"("tallySubmissionId");

-- CreateIndex
CREATE INDEX "EvidenciaTallyReemplazo_formId_idx" ON "EvidenciaTallyReemplazo"("formId");

-- CreateIndex
CREATE INDEX "EvidenciaTallyReemplazo_tallyFileUrl_idx" ON "EvidenciaTallyReemplazo"("tallyFileUrl");
