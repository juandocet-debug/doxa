import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME, SUPER_ADMIN_ID } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token  = req.cookies.get(COOKIE_NAME)?.value;
  const compId = token ? await verifyToken(token) : null;

  const isSuper = compId === SUPER_ADMIN_ID || compId?.endsWith(':super') === true;
  const cleanId = compId ? compId.split(':')[0] : null;

  // Proteger /superadmin — solo superadmin
  if (pathname.startsWith('/superadmin')) {
    if (!isSuper) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // Proteger /admin — cualquier usuario autenticado
  if (pathname.startsWith('/admin')) {
    if (!cleanId) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    // Superadmin en /admin → redirigir a su panel
    if (compId === SUPER_ADMIN_ID) {
      const url = req.nextUrl.clone();
      url.pathname = '/superadmin';
      return NextResponse.redirect(url);
    }
  }

  // Raíz → redirigir según rol
  if (pathname === '/') {
    const url = req.nextUrl.clone();
    if (!cleanId) url.pathname = '/login';
    else if (isSuper) url.pathname = '/superadmin';
    else url.pathname = '/admin/evidencias';
    return NextResponse.redirect(url);
  }


  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/admin/:path*', '/superadmin/:path*'],
};
