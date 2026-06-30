import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, AuthError } from '@/lib/session-helper';

export async function GET() {
  try {
    await requireSuperAdmin();

    const usuarios = await prisma.doxaUsuario.findMany({
      include: {
        permisos: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    return NextResponse.json({ usuarios });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireSuperAdmin();

    const body = await req.json() as {
      userId: string;
      activo: boolean;
      permisos: Array<{
        componenteId: string;
        puedeVer: boolean;
        puedeAprobar: boolean;
        puedeDevolver: boolean;
        puedeReemplazar: boolean;
        puedeSincronizarBackup: boolean;
        puedeExportar: boolean;
      }>;
    };

    if (!body.userId) {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
    }

    // Update active status
    await prisma.doxaUsuario.update({
      where: { id: body.userId },
      data: { activo: body.activo }
    });

    // Upsert each permission
    if (body.permisos && Array.isArray(body.permisos)) {
      await Promise.all(
        body.permisos.map((p) =>
          prisma.doxaPermisoComponente.upsert({
            where: {
              usuarioId_componenteId: {
                usuarioId: body.userId,
                componenteId: p.componenteId,
              },
            },
            update: {
              puedeVer: p.puedeVer,
              puedeAprobar: p.puedeAprobar,
              puedeDevolver: p.puedeDevolver,
              puedeReemplazar: p.puedeReemplazar,
              puedeSincronizarBackup: p.puedeSincronizarBackup,
              puedeExportar: p.puedeExportar,
            },
            create: {
              usuarioId: body.userId,
              componenteId: p.componenteId,
              puedeVer: p.puedeVer,
              puedeAprobar: p.puedeAprobar,
              puedeDevolver: p.puedeDevolver,
              puedeReemplazar: p.puedeReemplazar,
              puedeSincronizarBackup: p.puedeSincronizarBackup,
              puedeExportar: p.puedeExportar,
            },
          })
        )
      );
    }

    return NextResponse.json({ success: true, message: 'Permisos actualizados correctamente' });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
