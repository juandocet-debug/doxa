import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signToken, COOKIE_NAME, SUPER_ADMIN_ID, SUPER_PASSWORD } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  const { compId, password } = await req.json() as { compId: string; password: string };

  // Super admin fallback (local credential)
  if (compId === SUPER_ADMIN_ID) {
    if (password !== SUPER_PASSWORD) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }
    const token = await signToken(SUPER_ADMIN_ID);
    const jar   = await cookies();
    jar.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
      secure: process.env.NODE_ENV === 'production'
    });
    return NextResponse.json({ ok: true, compId: SUPER_ADMIN_ID, nombre: 'Super Administrador', isSuperAdmin: true });
  }

  // Authenticaton via Icaro API secure endpoint
  const icaroUrl = process.env.ICARO_API_URL;
  if (!icaroUrl) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta (ICARO_API_URL no configurado)' }, { status: 500 });
  }

  try {
    const icaroRes = await fetch(`${icaroUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: compId, password })
    });

    if (!icaroRes.ok) {
      const errData = await icaroRes.json().catch(() => ({}));
      return NextResponse.json({ error: errData.error || 'Credenciales inválidas en Ágora/Icaro' }, { status: 401 });
    }

    const icaroUser = await icaroRes.json();
    const extId = String(icaroUser.id || icaroUser.externalUserId || icaroUser.email || compId);

    // Sync user locally in Neon
    let user = await prisma.doxaUsuario.findUnique({
      where: { externalUserId: extId }
    });

    if (!user) {
      user = await prisma.doxaUsuario.create({
        data: {
          externalUserId: extId,
          nombre: icaroUser.nombre || icaroUser.nombreCompleto || icaroUser.name || compId,
          email: icaroUser.email || null,
          documento: icaroUser.documento || null,
          rolBase: icaroUser.rolBase || icaroUser.rol || 'usuario',
          activo: true
        }
      });
    } else {
      user = await prisma.doxaUsuario.update({
        where: { id: user.id },
        data: {
          nombre: icaroUser.nombre || icaroUser.nombreCompleto || icaroUser.name || user.nombre,
          email: icaroUser.email || user.email,
          documento: icaroUser.documento || user.documento,
          rolBase: icaroUser.rolBase || icaroUser.rol || user.rolBase,
          lastSyncedAt: new Date()
        }
      });
    }

    if (!user.activo) {
      return NextResponse.json({ error: 'El acceso a DOXA para este usuario está inactivo. Contacte al administrador.' }, { status: 403 });
    }

    const token = await signToken(user.id);
    const jar   = await cookies();
    jar.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
      secure: process.env.NODE_ENV === 'production'
    });

    return NextResponse.json({
      ok: true,
      compId: user.id,
      nombre: user.nombre,
      isSuperAdmin: false
    });

  } catch (err: unknown) {
    console.error('Icaro auth connection error:', err);
    return NextResponse.json({ error: 'Error de conexión con el servidor de autenticación de Icaro' }, { status: 502 });
  }
}

