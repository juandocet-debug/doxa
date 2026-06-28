const isBuildPhase = process.env.NEXT_PHASE?.includes('build') || process.env.VERCEL === '1';

if (!isBuildPhase) {
  if (!process.env.AUTH_SECRET) {
    throw new Error("CRITICAL CONFIGURATION ERROR: AUTH_SECRET is not set in the environment.");
  }
  if (!process.env.SUPER_PASSWORD) {
    throw new Error("CRITICAL CONFIGURATION ERROR: SUPER_PASSWORD is not set in the environment.");
  }
  if (!process.env.GENERIC_PASSWORD) {
    throw new Error("CRITICAL CONFIGURATION ERROR: GENERIC_PASSWORD is not set in the environment.");
  }
}

const SECRET = process.env.AUTH_SECRET || "fallback-ev-secret-only-for-build-purposes";
export const COOKIE_NAME      = 'ev_auth';
export const GENERIC_PASSWORD = process.env.GENERIC_PASSWORD || "dummy-generic-pass";
export const SUPER_ADMIN_ID   = 'superadmin';
export const SUPER_PASSWORD   = process.env.SUPER_PASSWORD || "dummy-super-pass";
export const VERIFICADOR_ID   = 'verificador';
export const VERIFICADOR_PASSWORD = process.env.VERIFICADOR_PASSWORD || "dummy-verificador-pass";

export async function signToken(compId: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const raw = await crypto.subtle.sign('HMAC', key, enc.encode(compId));
  const sig = Array.from(new Uint8Array(raw))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${compId}.${sig}`;
}

export async function verifyToken(token: string): Promise<string | null> {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const compId = token.slice(0, dot);
  const sig    = token.slice(dot + 1);
  const enc    = new TextEncoder();
  const key    = await crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const raw = await crypto.subtle.sign('HMAC', key, enc.encode(compId));
  const expected = Array.from(new Uint8Array(raw))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return sig === expected ? compId : null;
}

