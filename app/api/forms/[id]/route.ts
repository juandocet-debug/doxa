import { NextResponse } from 'next/server';
import { deleteTallyForm } from '@/lib/tally-mcp';
import { requireSuperAdmin, AuthError } from '@/lib/session-helper';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    await deleteTallyForm(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error desconocido' }, { status: 500 });
  }
}

