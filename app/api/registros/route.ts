import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSession, AuthError } from '@/lib/session-helper';
import { SUPER_ADMIN_ID } from '@/lib/auth';
import { createRegistro } from '@/src/application/use-cases/create-registro';

export async function GET(request: NextRequest) {
  try {
    const currentUserId = await requireSession();
    const isSuperAdmin = currentUserId === SUPER_ADMIN_ID;

    const { searchParams } = new URL(request.url);
    const metaId = searchParams.get('metaId');
    const componenteId = searchParams.get('componenteId');
    const accionId = searchParams.get('accionId');
    const instanciaId = searchParams.get('instanciaId');
    const estado = searchParams.get('estado');
    const responsable = searchParams.get('responsable');
    const municipio = searchParams.get('municipio');
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (metaId) where.metaId = metaId;
    
    // Access control: Coordinators can only query their own component
    if (isSuperAdmin) {
      if (componenteId) where.componenteId = componenteId;
    } else {
      where.componenteId = currentUserId;
    }

    if (accionId) where.accionId = accionId;
    if (instanciaId) where.instanciaAccionId = instanciaId;
    if (estado) where.estado = estado;
    if (responsable) where.responsable = { contains: responsable };
    if (municipio) where.municipio = { contains: municipio };
    if (desde || hasta) {
      where.fechaActividad = {};
      if (desde) (where.fechaActividad as Record<string, unknown>).gte = new Date(desde);
      if (hasta) (where.fechaActividad as Record<string, unknown>).lte = new Date(hasta);
    }

    const [total, registros] = await Promise.all([
      prisma.registro.count({ where }),
      prisma.registro.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          meta: { select: { id: true, nombre: true } },
          componente: { select: { id: true, nombre: true } },
          accion: { select: { id: true, nombre: true } },
          instancia: { select: { id: true, nombre: true } },
          evidencias: {
            include: {
              evidenciaRequerida: { select: { id: true, nombre: true, obligatorio: true } },
              archivos: { select: { id: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      registros,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching registros:', error);
    return NextResponse.json({ error: 'Error al obtener registros' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUserId = await requireSession();
    const isSuperAdmin = currentUserId === SUPER_ADMIN_ID;

    const body = await request.json();
    const {
      metaId,
      componenteId,
      accionId,
      instanciaAccionId,
      fechaActividad,
      responsable,
      municipio,
      localidad,
      lugar,
      observaciones,
    } = body;

    // Use currentUserId for component coordination
    const targetComponenteId = isSuperAdmin ? componenteId : currentUserId;

    if (!metaId || !targetComponenteId || !accionId || !fechaActividad || !responsable || !municipio) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const registro = await createRegistro({
      metaId,
      componenteId: targetComponenteId,
      accionId,
      instanciaAccionId: instanciaAccionId || null,
      fechaActividad: new Date(fechaActividad),
      responsable,
      municipio,
      localidad: localidad || null,
      lugar: lugar || null,
      observaciones: observaciones || null,
      createdBy: currentUserId,
    });

    return NextResponse.json({ registro }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error creating registro:', error);
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 });
  }
}


