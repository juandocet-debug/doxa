import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserSession, checkComponentPermission, logAuditoria, AuthError } from '@/lib/session-helper';
import { COMPONENTES } from '@/lib/componentes';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUserSession();
    const { id } = await params;
    const body = await req.json();
    const { estado, notas, formId } = body as {
      estado: 'pendiente' | 'aprobada' | 'rechazada';
      notas?: string;
      formId: string;
    };

    if (!['pendiente', 'aprobada', 'rechazada'].includes(estado)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    // Resolve component from formId
    const component = COMPONENTES.find(c => c.formId === formId);
    if (!component) {
      return NextResponse.json({ error: 'Componente no válido' }, { status: 400 });
    }

    // Verify permission on backend
    const permKey = estado === 'aprobada' ? 'puedeAprobar' : 'puedeDevolver';
    const isAuthorized = await checkComponentPermission(session, component.id, permKey);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const currentApproval = await prisma.aprobacionTally.findUnique({
      where: { tallySubmissionId: id }
    });

    const aprobacion = await prisma.aprobacionTally.upsert({
      where: { tallySubmissionId: id },
      update: { estado, notas: notas ?? null, actualizadoEn: new Date() },
      create: { tallySubmissionId: id, formId, estado, notas: notas ?? null },
    });

    const { invalidateCache } = await import('@/lib/evidencias/tally-fetch');
    invalidateCache(formId);

    // Write audit trail
    await logAuditoria({
      usuarioId: session.isSuperAdmin ? null : session.userId,
      accion: estado === 'aprobada' ? 'APROBAR_EVIDENCIA' : 'DEVOLVER_EVIDENCIA',
      componenteId: component.id,
      formId,
      tallySubmissionId: id,
      estadoAnterior: currentApproval?.estado || 'pendiente',
      estadoNuevo: estado,
      detalle: notas || null
    });

    return NextResponse.json({ aprobacion });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}