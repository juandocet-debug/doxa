import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME, SUPER_ADMIN_ID } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const jar    = await cookies();
  const token  = jar.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const compId = await verifyToken(token);
  if (!compId)  return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  if (compId === SUPER_ADMIN_ID) {
    return NextResponse.json({
      compId: SUPER_ADMIN_ID,
      nombre: 'Super Administrador',
      isSuperAdmin: true,
      permisos: [],
      grupos: []
    });
  }

  const user = await prisma.doxaUsuario.findUnique({
    where: { id: compId },
    include: { permisos: true }
  });

  if (!user || !user.activo) {
    return NextResponse.json({ error: 'Usuario no encontrado o inactivo' }, { status: 401 });
  }

  const isSuper = user.rolBase === 'Super Administrador' || user.rolBase === 'Administrador' || user.documento === '1013600005' || user.email === 'juandocet@gmail.com';
  return NextResponse.json({
    compId: user.id,
    nombre: user.nombre,
    email: user.email,
    documento: user.documento,
    rolBase: user.rolBase,
    fotoUrl: user.fotoUrl,
    permisos: user.permisos,
    isSuperAdmin: isSuper
  });
}
