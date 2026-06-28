import { NextResponse } from 'next/server';
import { listForms } from '@/lib/tally-api';
import { requireSuperAdmin, AuthError } from '@/lib/session-helper';

export async function GET() {
  try {
    await requireSuperAdmin();
    const data = await listForms();
    return NextResponse.json(data);
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error desconocido' }, { status: 500 });
  }
}

