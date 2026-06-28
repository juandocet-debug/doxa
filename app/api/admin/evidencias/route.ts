import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { COMPONENTES } from '@/lib/componentes';
import { requireSession, AuthError } from '@/lib/session-helper';
import { SUPER_ADMIN_ID } from '@/lib/auth';

const API = process.env.TALLY_API_URL!;
const KEY = process.env.TALLY_API_KEY!;

export interface TallyFile {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface SubmisionEvidencia {
  submissionId: string;
  formId: string;
  componenteId: string;
  componenteNombre: string;
  grupo: string;
  clase: string;
  fechaEnvio: string;
  fotos: { label: string; archivos: TallyFile[] }[];
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  notas: string | null;
}

async function fetchSubmissions(formId: string) {
  const res = await fetch(`${API}/forms/${formId}/submissions?limit=500`, {
    headers: { Authorization: `Bearer ${KEY}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Tally API ${res.status} for form ${formId}`);
  const data = await res.json();
  // Tally returns questions/submissions at top level, not nested under data
  return {
    questions: (data.questions ?? []) as { id: string; title: string; type: string }[],
    submissions: (data.submissions ?? []) as {
      id: string;
      submittedAt: string;
      createdAt: string;
      responses: { questionId: string; answer: unknown }[];
    }[],
  };
}

function extractAnswer(answer: unknown): string {
  if (!answer) return '';
  if (Array.isArray(answer)) return (answer[0] as string) ?? '';
  return String(answer);
}

function extractFiles(answer: unknown): TallyFile[] {
  if (!Array.isArray(answer)) return [];
  return answer.filter((f) => f && typeof f === 'object' && 'url' in f) as TallyFile[];
}


export async function GET(req: Request) {
  try {
    const currentUserId = await requireSession();
    const isSuperAdmin = currentUserId === SUPER_ADMIN_ID;
    const hasGlobalRead = isSuperAdmin || currentUserId === 'verificador';

    const { searchParams } = new URL(req.url);
    const filterComponente = searchParams.get('componente');
    const filterGrupo = searchParams.get('grupo');

    // Access control: Non-superadmin is locked to their own component
    const targetComponente = hasGlobalRead ? filterComponente : currentUserId;

    const componentes = targetComponente
      ? COMPONENTES.filter((c) => c.id === targetComponente)
      : COMPONENTES;

    const allSubmissions: SubmisionEvidencia[] = [];

    for (const comp of componentes) {
      const { questions, submissions } = await fetchSubmissions(comp.formId);

      const grupoQ = questions.find(
        (q) => q.title?.toLowerCase().includes('grupo') || q.title?.toLowerCase().includes('selecciona')
      );
      const claseQ = questions.find(
        (q) => q.title?.toLowerCase().includes('clase') || q.title?.toLowerCase().includes('número')
      );
      // Use type FILE_UPLOAD to reliably detect all photo/file questions
      const fotoQs = questions.filter((q) => q.type === 'FILE_UPLOAD');

      for (const sub of submissions) {
        const getResp = (qId: string) =>
          sub.responses.find((r) => r.questionId === qId)?.answer;

        const grupo = grupoQ ? extractAnswer(getResp(grupoQ.id)) : '';
        const clase = claseQ ? extractAnswer(getResp(claseQ.id)) : '';

        if (filterGrupo && grupo !== filterGrupo) continue;

        const fotos = fotoQs.map((q) => ({
          label: q.title ?? q.id,
          archivos: extractFiles(getResp(q.id)),
        }));

        const aprobacion = await prisma.aprobacionTally.findUnique({
          where: { tallySubmissionId: sub.id },
        });

        allSubmissions.push({
          submissionId: sub.id,
          formId: comp.formId,
          componenteId: comp.id,
          componenteNombre: comp.nombre,
          grupo,
          clase,
          fechaEnvio: sub.submittedAt ?? sub.createdAt,
          fotos,
          estado: (aprobacion?.estado as 'pendiente' | 'aprobada' | 'rechazada') ?? 'pendiente',
          notas: aprobacion?.notas ?? null,
        });
      }
    }

    allSubmissions.sort(
      (a, b) => new Date(b.fechaEnvio).getTime() - new Date(a.fechaEnvio).getTime()
    );

    return NextResponse.json({ submissions: allSubmissions });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
