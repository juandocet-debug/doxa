import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COMPONENTES } from '@/lib/componentes';
import { verifyToken, COOKIE_NAME, SUPER_ADMIN_ID, VERIFICADOR_ID } from '@/lib/auth';

export async function GET() {
  const jar    = await cookies();
  const token  = jar.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const compId = await verifyToken(token);
  if (!compId)  return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  if (compId === SUPER_ADMIN_ID) {
    return NextResponse.json({ compId: SUPER_ADMIN_ID, nombre: 'Super Administrador', isSuperAdmin: true, grupos: [] });
  }

  if (compId === VERIFICADOR_ID) {
    return NextResponse.json({ compId: VERIFICADOR_ID, nombre: 'Verificador', isVerificador: true, isSuperAdmin: false, grupos: [] });
  }

  const comp = COMPONENTES.find(c => c.id === compId);
  if (!comp) return NextResponse.json({ error: 'Componente no encontrado' }, { status: 404 });

  return NextResponse.json({ compId: comp.id, nombre: comp.nombre, formId: comp.formId, grupos: comp.grupos, isSuperAdmin: false });
}
