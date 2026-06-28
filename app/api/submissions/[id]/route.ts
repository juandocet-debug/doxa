import { NextResponse } from 'next/server';
import { getSubmissions } from '@/lib/tally-api';
import { prisma } from '@/lib/db';
import { requireSession, AuthError } from '@/lib/session-helper';
import { SUPER_ADMIN_ID } from '@/lib/auth';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUserId = await requireSession();
    const isSuperAdmin = currentUserId === SUPER_ADMIN_ID;

    const { id } = await params;

    // Access control: Ensure coordinator owns this form
    if (!isSuperAdmin) {
      const tallyForm = await prisma.tallyFormulario.findUnique({
        where: { tallyFormId: id }
      });
      if (!tallyForm || tallyForm.componenteId !== currentUserId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    const data = await getSubmissions(id);
    return NextResponse.json(data);
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error desconocido' }, { status: 500 });
  }
}

