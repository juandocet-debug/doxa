import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSession, AuthError } from '@/lib/session-helper';
import { SUPER_ADMIN_ID } from '@/lib/auth';

const API = process.env.TALLY_API_URL!;
const KEY = process.env.TALLY_API_KEY!;

export async function GET(req: Request) {
  try {
    const currentUserId = await requireSession();
    const isSuperAdmin = currentUserId === SUPER_ADMIN_ID;

    const { searchParams } = new URL(req.url);
    const formId = searchParams.get('formId');
    const grupo  = searchParams.get('grupo');
    const clase  = searchParams.get('clase');

    if (!formId || !grupo || !clase) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
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

    // Fetch up to 500 submissions (adjust if needed)
    const res = await fetch(
      `${API}/forms/${formId}/submissions?limit=500`,
      { headers: { Authorization: `Bearer ${KEY}` }, cache: 'no-store' }
    );

    if (!res.ok) throw new Error(`Tally API ${res.status}`);
    const data = await res.json();

    const questions: { id: string; title: string }[] = data.questions ?? [];
    const submissions: { responses: { questionId: string; answer: unknown }[] }[] =
      data.submissions ?? [];

    const grupoQ = questions.find(q =>
      q.title?.toLowerCase().includes('grupo') || q.title?.toLowerCase().includes('selecciona')
    );
    const claseQ = questions.find(q =>
      q.title?.toLowerCase().includes('clase') || q.title?.toLowerCase().includes('número')
    );

    if (!grupoQ || !claseQ) {
      return NextResponse.json({ alreadySubmitted: false, reason: 'questions-not-found' });
    }

    const alreadySubmitted = submissions.some(sub => {
      const grupoAns = sub.responses.find(r => r.questionId === grupoQ.id);
      const claseAns = sub.responses.find(r => r.questionId === claseQ.id);

      const grupoVal = Array.isArray(grupoAns?.answer)
        ? (grupoAns.answer as string[])[0]
        : String(grupoAns?.answer ?? '');
      const claseVal = Array.isArray(claseAns?.answer)
        ? (claseAns.answer as string[])[0]
        : String(claseAns?.answer ?? '');

      return grupoVal === grupo && claseVal === clase;
    });

    return NextResponse.json({ alreadySubmitted });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

