import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSession, AuthError } from '@/lib/session-helper';
import { SUPER_ADMIN_ID } from '@/lib/auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUserId = await requireSession();
    if (currentUserId === 'verificador') {
      return NextResponse.json({ error: 'No autorizado (Solo lectura)' }, { status: 403 });
    }
    const isSuperAdmin = currentUserId === SUPER_ADMIN_ID;

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

    // Access control: Ensure coordinator owns this form
    if (!isSuperAdmin) {
      const tallyForm = await prisma.tallyFormulario.findUnique({
        where: { tallyFormId: formId }
      });
      if (!tallyForm || tallyForm.componenteId !== currentUserId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    const aprobacion = await prisma.aprobacionTally.upsert({
      where: { tallySubmissionId: id },
      update: { estado, notas: notas ?? null, actualizadoEn: new Date() },
      create: { tallySubmissionId: id, formId, estado, notas: notas ?? null },
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