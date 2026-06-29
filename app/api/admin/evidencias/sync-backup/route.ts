import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/session-helper';
import { SUPER_ADMIN_ID, VERIFICADOR_ID } from '@/lib/auth';
import { syncSubmissionSnapshot, syncFormSnapshots } from '@/lib/sync-service';

export async function POST(req: Request) {
  try {
    const currentUserId = await requireSession();
    
    const { formId, submissionId } = await req.json() as { formId: string; submissionId?: string };
    if (!formId) {
      return NextResponse.json({ error: 'Falta el parámetro formId' }, { status: 400 });
    }

    // Access control check
    const hasGlobalAccess = currentUserId === SUPER_ADMIN_ID || currentUserId === VERIFICADOR_ID;
    if (!hasGlobalAccess) {
      const tallyForm = await prisma.tallyFormulario.findUnique({
        where: { tallyFormId: formId }
      });
      if (!tallyForm || tallyForm.componenteId !== currentUserId) {
        return NextResponse.json({ error: 'No está autorizado para sincronizar respaldos de este componente.' }, { status: 403 });
      }
    }

    if (submissionId) {
      // Sync specific submission
      const result = await syncSubmissionSnapshot(formId, submissionId);
      return NextResponse.json({
        ok: true,
        message: `Envío ${submissionId} sincronizado con éxito.`,
        data: result
      });
    } else {
      // Sync whole form
      const result = await syncFormSnapshots(formId);
      return NextResponse.json({
        ok: true,
        message: `Formulario ${formId} sincronizado.`,
        data: result
      });
    }
  } catch (error: unknown) {
    console.error('Error in sync-backup API:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error interno de sincronización';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
