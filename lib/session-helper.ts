import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME, SUPER_ADMIN_ID } from './auth';

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
  if (compId !== SUPER_ADMIN_ID) {
    throw new AuthError('No autorizado', 403);
  }
  return compId;
}
