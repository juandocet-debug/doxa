import { NextResponse } from 'next/server';
import { requireUserSession, checkComponentPermission, logAuditoria, AuthError } from '@/lib/session-helper';
import { COMPONENTES } from '@/lib/componentes';
import { syncSubmissionSnapshot, syncFormSnapshots } from '@/lib/sync-service';

export async function POST(req: Request) {
  try {
    const session = await requireUserSession();
    
    const { formId, submissionId } = await req.json() as { formId: string; submissionId?: string };
    if (!formId) {
      return NextResponse.json({ error: 'Falta el parámetro formId' }, { status: 400 });
    }

    // Resolve component from formId
    const component = COMPONENTES.find(c => c.formId === formId);
    if (!component) {
      return NextResponse.json({ error: 'Componente no válido' }, { status: 400 });
    }

    // Verify permission on backend
    const isAuthorized = await checkComponentPermission(session, component.id, 'puedeSincronizarBackup');
    if (!isAuthorized) {
      return NextResponse.json({ error: 'No está autorizado para sincronizar respaldos de este componente.' }, { status: 403 });
    }

    if (submissionId) {
      // Sync specific submission
      const result = await syncSubmissionSnapshot(formId, submissionId);

      await logAuditoria({
        usuarioId: session.isSuperAdmin ? null : session.userId,
        accion: 'SINCRONIZAR_RESPALDO_ENTREGA',
        componenteId: component.id,
        formId,
        tallySubmissionId: submissionId,
        detalle: `Sincronización de respaldo para entrega ${submissionId}`
      });

      return NextResponse.json({
        ok: true,
        message: `Envío ${submissionId} sincronizado con éxito.`,
        data: result
      });
    } else {
      // Sync whole form
      const result = await syncFormSnapshots(formId);

      await logAuditoria({
        usuarioId: session.isSuperAdmin ? null : session.userId,
        accion: 'SINCRONIZAR_RESPALDO_FORMULARIO',
        componenteId: component.id,
        formId,
        detalle: `Sincronización de todos los respaldos para formulario ${formId}`
      });

      return NextResponse.json({
        ok: true,
        message: `Formulario ${formId} sincronizado.`,
        data: result
      });
    }
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error in sync-backup API:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error interno de sincronización';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
