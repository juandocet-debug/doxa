import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserSession, checkComponentPermission, AuthError, ensureTallyRealActivityDateColumn, logAuditoria } from '@/lib/session-helper';

function parseDateOnly(value: unknown): Date | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Fecha invalida');
  return new Date(value + 'T12:00:00.000Z');
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUserSession();
    await ensureTallyRealActivityDateColumn();
    const { id: submissionId } = await params;
    const body = await req.json();
    const fechaActividadReal = parseDateOnly(body.fechaActividadReal);
    const componenteId = typeof body.componenteId === 'string' ? body.componenteId : null;
    if (!componenteId) return NextResponse.json({ error: 'Componente requerido' }, { status: 400 });
    const canEdit = await checkComponentPermission(session, componenteId, 'puedeReemplazar');
    if (!canEdit) return NextResponse.json({ error: 'No autorizado para cambiar la fecha real de esta entrega' }, { status: 403 });
    const fechaEnvio = typeof body.fechaEnvio === 'string' && body.fechaEnvio ? new Date(body.fechaEnvio) : null;
    const snapshot = await prisma.tallySubmissionSnapshot.upsert({
      where: { tallySubmissionId: submissionId },
      create: { tallySubmissionId: submissionId, formId: String(body.formId || ''), componenteId, componenteNombre: typeof body.componenteNombre === 'string' ? body.componenteNombre : null, grupo: typeof body.grupo === 'string' ? body.grupo : null, clase: typeof body.clase === 'string' ? body.clase : null, fechaEnvio, fechaActividadReal },
      update: { formId: String(body.formId || ''), componenteId, componenteNombre: typeof body.componenteNombre === 'string' ? body.componenteNombre : null, grupo: typeof body.grupo === 'string' ? body.grupo : null, clase: typeof body.clase === 'string' ? body.clase : null, fechaEnvio, fechaActividadReal },
      select: { tallySubmissionId: true, fechaActividadReal: true, fechaEnvio: true, componenteId: true, formId: true, grupo: true, clase: true },
    });
    if (snapshot.formId && snapshot.grupo && snapshot.clase) {
      await prisma.tallySubmissionSnapshot.updateMany({
        where: { formId: snapshot.formId, componenteId, grupo: snapshot.grupo, clase: snapshot.clase },
        data: { fechaActividadReal },
      });
    }
    await logAuditoria({ usuarioId: session.isSuperAdmin ? null : session.userId, accion: 'actualizar_fecha_real_tally', componenteId, formId: snapshot.formId, tallySubmissionId: submissionId, grupo: snapshot.grupo, clase: snapshot.clase, detalle: fechaActividadReal ? 'Fecha real: ' + fechaActividadReal.toISOString().slice(0, 10) : 'Fecha real limpiada' });
    return NextResponse.json({ ok: true, fechaActividadReal: fechaActividadReal?.toISOString() ?? null, grupo: snapshot.grupo, clase: snapshot.clase, formId: snapshot.formId });
  } catch (e: unknown) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: msg === 'Fecha invalida' ? 400 : 500 });
  }
}
