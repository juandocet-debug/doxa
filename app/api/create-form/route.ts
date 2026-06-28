import { NextResponse } from 'next/server';
import { createTallyForm, FormField, LogicRule } from '@/lib/tally-mcp';
import { requireSuperAdmin, AuthError } from '@/lib/session-helper';

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();

    const { title, fields, logic, status } = (await req.json()) as {
      title: string;
      fields: FormField[];
      logic?: LogicRule[];
      status?: 'PUBLISHED' | 'DRAFT';
    };

    if (!title || !fields?.length) {
      return NextResponse.json({ error: 'Título y campos son requeridos' }, { status: 400 });
    }

    const result = await createTallyForm(title, fields, logic || [], status || 'PUBLISHED');
    return NextResponse.json(result);
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error desconocido' }, { status: 500 });
  }
}

