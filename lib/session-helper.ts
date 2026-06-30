import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME, SUPER_ADMIN_ID } from './auth';
import { prisma } from './db';
import { DoxaUsuario, DoxaPermisoComponente } from '@prisma/client';

export async function getSession(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
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
  usuario: (DoxaUsuario & { permisos: DoxaPermisoComponente[] }) | null; // DoxaUsuario model instance with permisos or null if superadmin
}

export async function requireUserSession(): Promise<UserSession> {
  const sessionVal = await requireSession();
  if (sessionVal === SUPER_ADMIN_ID) {
    return { userId: SUPER_ADMIN_ID, isSuperAdmin: true, usuario: null };
  }
  const user = await prisma.doxaUsuario.findUnique({
    where: { id: sessionVal },
    include: { permisos: true }
  });
  if (!user || !user.activo) {
    throw new AuthError('Usuario inactivo o no autorizado', 403);
  }
  const isSuper = user.rolBase === 'Super Administrador' || user.rolBase === 'Administrador' || user.documento === '1013600005' || user.email === 'juandocet@gmail.com';
  return { userId: user.id, isSuperAdmin: isSuper, usuario: user };
}

export async function checkComponentPermission(
  session: UserSession,
  componenteId: string,
  permissionKey: 'puedeVer' | 'puedeAprobar' | 'puedeDevolver' | 'puedeReemplazar' | 'puedeSincronizarBackup' | 'puedeExportar'
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
