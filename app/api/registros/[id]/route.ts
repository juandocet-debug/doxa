import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSession, AuthError } from '@/lib/session-helper';
import { SUPER_ADMIN_ID } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUserId = await requireSession();
    const isSuperAdmin = currentUserId === SUPER_ADMIN_ID;

    const { id } = await params;
    const registro = await prisma.registro.findUnique({
      where: { id },
      include: {
        meta: true,
        componente: true,
        accion: true,
        instancia: true,
        evidencias: {
          include: {
            evidenciaRequerida: true,
            archivos: {
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!registro) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    // Access control check
    if (!isSuperAdmin && registro.componenteId !== currentUserId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json({ registro });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching registro:', error);
    return NextResponse.json({ error: 'Error al obtener registro' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUserId = await requireSession();
    const isSuperAdmin = currentUserId === SUPER_ADMIN_ID;

    const { id } = await params;

    // Verify ownership before modifying
    const existing = await prisma.registro.findUnique({
      where: { id },
      select: { componenteId: true }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    if (!isSuperAdmin && existing.componenteId !== currentUserId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'fechaActividad', 'responsable', 'municipio', 'localidad',
      'lugar', 'observaciones', 'estado',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'fechaActividad') {
          updateData[field] = new Date(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const registro = await prisma.registro.update({
      where: { id },
      data: updateData,
      include: {
        meta: true,
        componente: true,
        accion: true,
        instancia: true,
        evidencias: {
          include: {
            evidenciaRequerida: true,
            archivos: true,
          },
        },
      },
    });

    return NextResponse.json({ registro });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error updating registro:', error);
    return NextResponse.json({ error: 'Error al actualizar registro' }, { status: 500 });
  }
}

