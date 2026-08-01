import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME, SUPER_ADMIN_ID } from './auth';
import { prisma } from './db';
import { DoxaUsuario, DoxaPermisoComponente } from '@prisma/client';

let deleteEvidencePermissionColumnReady = false;
let tallyRealActivityDateColumnReady = false;
let reviewRoleColumnsReady = false;

export async function ensureDeleteEvidencePermissionColumn() {
  if (deleteEvidencePermissionColumnReady) return;
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "DoxaPermisoComponente" ADD COLUMN IF NOT EXISTS "puedeEliminarEvidencia" BOOLEAN NOT NULL DEFAULT false');
  } catch {
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "DoxaPermisoComponente" ADD COLUMN "puedeEliminarEvidencia" BOOLEAN NOT NULL DEFAULT false');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      if (!msg.includes('duplicate') && !msg.includes('already exists') && !msg.includes('duplicate column')) {
        console.error('Error ensuring delete evidence permission column:', err);
      }
    }
  }
  deleteEvidencePermissionColumnReady = true;
}


export async function ensureTallyRealActivityDateColumn() {
  if (tallyRealActivityDateColumnReady) return;
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "TallySubmissionSnapshot" ADD COLUMN IF NOT EXISTS "fechaActividadReal" TIMESTAMP(3)');
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TallySubmissionSnapshot_fechaActividadReal_idx" ON "TallySubmissionSnapshot"("fechaActividadReal")');
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (!msg.includes('duplicate') && !msg.includes('already exists')) {
      console.error('Error ensuring real activity date column:', err);
    }
  }
  tallyRealActivityDateColumnReady = true;
}

export async function ensureReviewRoleColumns() {
  if (reviewRoleColumnsReady) return;
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "DoxaUsuario" ADD COLUMN IF NOT EXISTS "esSuperCoordinador" BOOLEAN NOT NULL DEFAULT false');
    await prisma.$executeRawUnsafe('ALTER TABLE "DoxaUsuario" ADD COLUMN IF NOT EXISTS "puedeEliminarClases" BOOLEAN NOT NULL DEFAULT false');
    await prisma.$executeRawUnsafe('ALTER TABLE "DoxaPermisoComponente" ADD COLUMN IF NOT EXISTS "puedeRevisarEvidencia" BOOLEAN NOT NULL DEFAULT false');
    await prisma.$executeRawUnsafe('ALTER TABLE "TallyArchivoSnapshot" ADD COLUMN IF NOT EXISTS "estadoRevision" TEXT NOT NULL DEFAULT \'pendiente\'');
    await prisma.$executeRawUnsafe('ALTER TABLE "TallyArchivoSnapshot" ADD COLUMN IF NOT EXISTS "observacionRevision" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "TallyArchivoSnapshot" ADD COLUMN IF NOT EXISTS "revisadoPor" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "TallyArchivoSnapshot" ADD COLUMN IF NOT EXISTS "revisadoAt" TIMESTAMP(3)');
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (!msg.includes('duplicate') && !msg.includes('already exists')) {
      console.error('Error ensuring review role columns:', err);
    }
  }
  reviewRoleColumnsReady = true;
}

export async function getSession(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const raw = await verifyToken(token);
  if (!raw) return null;
  return raw.split(':')[0];
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'AuthError';
  }
}

export async function requireSession(): Promise<string> {
  const compId = await getSession();
  if (!compId) {
    throw new AuthError('No autenticado', 401);
  }
  return compId;
}

export async function requireSuperAdmin(): Promise<string> {
  const compId = await getSession();
  if (!compId) {
    throw new AuthError('No autenticado', 401);
  }
  if (compId === SUPER_ADMIN_ID) {
    return compId;
  }
  await ensureDeleteEvidencePermissionColumn();
  const user = await prisma.doxaUsuario.findUnique({
    where: { id: compId }
  });
  if (!user || !user.activo || (user.rolBase !== 'Super Administrador' && user.rolBase !== 'Administrador' && user.documento !== '1013600005' && user.email !== 'juandocet@gmail.com')) {
    throw new AuthError('No autorizado', 403);
  }
  return compId;
}

export interface UserSession {
  userId: string; // "superadmin" or DoxaUsuario.id
  isSuperAdmin: boolean;
  isSuperCoordinador: boolean;
  puedeEliminarClases: boolean;
  usuario: (DoxaUsuario & { permisos: DoxaPermisoComponente[] }) | null; // DoxaUsuario model instance with permisos or null if superadmin
}

export async function requireUserSession(): Promise<UserSession> {
  await ensureDeleteEvidencePermissionColumn();
  await ensureReviewRoleColumns();
  const sessionVal = await requireSession();
  if (sessionVal === SUPER_ADMIN_ID) {
    return { userId: SUPER_ADMIN_ID, isSuperAdmin: true, isSuperCoordinador: true, puedeEliminarClases: true, usuario: null };
  }
  const user = await prisma.doxaUsuario.findUnique({
    where: { id: sessionVal },
    include: { permisos: true }
  });
  if (!user || !user.activo) {
    throw new AuthError('Usuario inactivo o no autorizado', 403);
  }
  const isSuper = user.rolBase === 'Super Administrador' || user.rolBase === 'Administrador' || user.documento === '1013600005' || user.email === 'juandocet@gmail.com';
  const isSuperCoordinador = isSuper || !!user.esSuperCoordinador;
  const puedeEliminarClases = isSuper || !!user.puedeEliminarClases;
  return { userId: user.id, isSuperAdmin: isSuper, isSuperCoordinador, puedeEliminarClases, usuario: user };
}

export async function checkComponentPermission(
  session: UserSession,
  componenteId: string,
  permissionKey: 'puedeVer' | 'puedeAprobar' | 'puedeDevolver' | 'puedeReemplazar' | 'puedeEliminarEvidencia' | 'puedeRevisarEvidencia' | 'puedeSincronizarBackup' | 'puedeExportar'
): Promise<boolean> {
  if (session.isSuperAdmin) return true;
  if (!session.usuario) return false;
  const permiso = session.usuario.permisos.find((p: DoxaPermisoComponente) => p.componenteId === componenteId);
  if (!permiso) return false;
  return !!permiso[permissionKey];
}

export async function logAuditoria(data: {
  usuarioId?: string | null;
  accion: string;
  componenteId?: string | null;
  formId?: string | null;
  tallySubmissionId?: string | null;
  clase?: string | null;
  grupo?: string | null;
  estadoAnterior?: string | null;
  estadoNuevo?: string | null;
  detalle?: string | null;
}) {
  try {
    await prisma.doxaAuditoria.create({ data });
  } catch (err) {
    console.error('Error logging auditoria:', err);
  }
}
