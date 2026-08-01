ALTER TABLE "TallySubmissionSnapshot" ADD COLUMN IF NOT EXISTS "fechaActividadReal" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "TallySubmissionSnapshot_fechaActividadReal_idx" ON "TallySubmissionSnapshot"("fechaActividadReal");
