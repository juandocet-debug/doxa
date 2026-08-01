ALTER TABLE "DoxaUsuario" ADD COLUMN IF NOT EXISTS "esSuperCoordinador" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DoxaUsuario" ADD COLUMN IF NOT EXISTS "puedeEliminarClases" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "DoxaPermisoComponente" ADD COLUMN IF NOT EXISTS "puedeRevisarEvidencia" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "TallyArchivoSnapshot" ADD COLUMN IF NOT EXISTS "estadoRevision" TEXT NOT NULL DEFAULT 'pendiente';
ALTER TABLE "TallyArchivoSnapshot" ADD COLUMN IF NOT EXISTS "observacionRevision" TEXT;
ALTER TABLE "TallyArchivoSnapshot" ADD COLUMN IF NOT EXISTS "revisadoPor" TEXT;
ALTER TABLE "TallyArchivoSnapshot" ADD COLUMN IF NOT EXISTS "revisadoAt" TIMESTAMP(3);
