CREATE TABLE "TallyClassCode" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "componenteId" TEXT NOT NULL,
    "componenteNombre" TEXT,
    "grupo" TEXT NOT NULL,
    "clase" TEXT NOT NULL,
    "grupoKey" TEXT NOT NULL,
    "claseKey" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TallyClassCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TallyClassCode_code_key" ON "TallyClassCode"("code");
CREATE UNIQUE INDEX "TallyClassCode_formId_componenteId_grupoKey_claseKey_key" ON "TallyClassCode"("formId", "componenteId", "grupoKey", "claseKey");
CREATE INDEX "TallyClassCode_formId_idx" ON "TallyClassCode"("formId");
CREATE INDEX "TallyClassCode_componenteId_idx" ON "TallyClassCode"("componenteId");
CREATE INDEX "TallyClassCode_grupoKey_idx" ON "TallyClassCode"("grupoKey");
CREATE INDEX "TallyClassCode_claseKey_idx" ON "TallyClassCode"("claseKey");
