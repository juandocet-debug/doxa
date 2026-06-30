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
    const icaroRes = await fetch(`${icaroUrl}/api/auth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: compId, password })
    });

    if (!icaroRes.ok) {
      const errData = await icaroRes.json().catch(() => ({}));
      return NextResponse.json({ error: errData.detail || 'Credenciales inválidas en Ágora/Icaro' }, { status: 401 });
    }

    const tokenData = await icaroRes.json() as { access: string };
    
    // Fetch profile info using token
    const profileRes = await fetch(`${icaroUrl}/api/auth/perfil/`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access}`,
        'Content-Type': 'application/json',
      }
    });

    if (!profileRes.ok) {
      return NextResponse.json({ error: 'No se pudo obtener el perfil de Icaro' }, { status: 502 });
    }

    const profileBody = await profileRes.json() as { ok: boolean; datos: {
      user_id: number;
      username: string;
      email?: string;
      cedula?: string;
      primer_nombre?: string;
      primer_apellido?: string;
      photo_url?: string;
      cargo?: string;
    }};

    const p = profileBody.datos;
    const extId = String(p.user_id);
    const nombre = [p.primer_nombre, p.primer_apellido].filter(Boolean).join(' ') || p.username;
    const fotoUrl = p.photo_url || null;
    const rolBase = p.cargo || 'Usuario';

    // Sync user locally in Neon
    let user = await prisma.doxaUsuario.findUnique({
      where: { externalUserId: extId }
    });

    if (!user) {
      user = await prisma.doxaUsuario.create({
        data: {
          externalUserId: extId,
          nombre,
          email: p.email || null,
          documento: p.cedula || p.username || null,
          rolBase,
          fotoUrl,
          activo: true
        }
      });
    } else {
      user = await prisma.doxaUsuario.update({
        where: { id: user.id },
        data: {
          nombre,
          email: p.email || user.email,
          documento: p.cedula || p.username || user.documento,
          rolBase,
          fotoUrl,
          lastSyncedAt: new Date()
        }
      });
    }

    if (!user.activo) {
      return NextResponse.json({ error: 'El acceso a DOXA para este usuario está inactivo. Contacte al administrador.' }, { status: 403 });
    }

    const isSuper = user.rolBase === 'Super Administrador' || user.rolBase === 'Administrador' || user.documento === '1013600005' || user.email === 'juandocet@gmail.com';
    const token = await signToken(isSuper ? `${user.id}:super` : user.id);
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
      isSuperAdmin: isSuper
    });

  } catch (err: unknown) {
    console.error('Icaro auth connection error:', err);
    return NextResponse.json({ error: 'Error de conexión con el servidor de autenticación de Icaro' }, { status: 502 });
  }
}

