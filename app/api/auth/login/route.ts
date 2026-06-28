import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COMPONENTES } from '@/lib/componentes';
import { signToken, COOKIE_NAME, GENERIC_PASSWORD, SUPER_ADMIN_ID, SUPER_PASSWORD, VERIFICADOR_ID, VERIFICADOR_PASSWORD } from '@/lib/auth';

export async function POST(req: Request) {
  const { compId, password } = await req.json() as { compId: string; password: string };

  // Super admin
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

  // Verificador
  if (compId === VERIFICADOR_ID) {
    if (password !== VERIFICADOR_PASSWORD) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }
    const token = await signToken(VERIFICADOR_ID);
    const jar   = await cookies();
    jar.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
      secure: process.env.NODE_ENV === 'production'
    });
    return NextResponse.json({ ok: true, compId: VERIFICADOR_ID, nombre: 'Verificador', isVerificador: true });
  }

  // Coordinador de componente
  const comp = COMPONENTES.find(c => c.id === compId);
  if (!comp) return NextResponse.json({ error: 'Componente no válido' }, { status: 400 });
  if (password !== GENERIC_PASSWORD) return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });

  const token = await signToken(compId);
  const jar   = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
    secure: process.env.NODE_ENV === 'production'
  });
  return NextResponse.json({ ok: true, compId, nombre: comp.nombre });
}

