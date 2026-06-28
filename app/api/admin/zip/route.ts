import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { prisma } from '@/lib/db';
import { requireSession, AuthError } from '@/lib/session-helper';
import { SUPER_ADMIN_ID } from '@/lib/auth';

const API = process.env.TALLY_API_URL!;
const KEY = process.env.TALLY_API_KEY!;

function slug(s: string) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function ext(name: string, mime: string) {
  if (name.includes('.')) return '';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('png'))  return '.png';
  if (mime.includes('pdf'))  return '.pdf';
  return '';
}

export async function GET(req: Request) {
  try {
    const currentUserId = await requireSession();
    const isSuperAdmin = currentUserId === SUPER_ADMIN_ID;

    const { searchParams } = new URL(req.url);
    const formId       = searchParams.get('formId');
    const submissionId = searchParams.get('submissionId');
    const zipName      = searchParams.get('zipName') || 'evidencias';

    if (!formId || !submissionId) {
      return NextResponse.json({ error: 'Faltan parametros' }, { status: 400 });
    }

    // Access control: Ensure coordinator owns this form
    if (!isSuperAdmin) {
      const tallyForm = await prisma.tallyFormulario.findUnique({
        where: { tallyFormId: formId }
      });
      if (!tallyForm || tallyForm.componenteId !== currentUserId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }    // Obtener submissions con URLs frescas
    const res  = await fetch(`${API}/forms/${formId}/submissions?limit=500`, {
      headers: { Authorization: `Bearer ${KEY}` }, cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Tally API ${res.status}`);
    const data = await res.json();

    const questions = (data.questions ?? []) as { id: string; title: string; type: string }[];
    const sub = ((data.submissions ?? []) as {
      id: string;
      responses: { questionId: string; answer: unknown }[];
    }[]).find(s => s.id === submissionId);

    if (!sub) return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 });

    const fotoQs = questions.filter(q => q.type === 'FILE_UPLOAD');

    const zip = new JSZip();
    let idx   = 1;

    for (const q of fotoQs) {
      const resp  = sub.responses.find(r => r.questionId === q.id);
      const files = Array.isArray(resp?.answer) ? resp.answer as { url: string; name: string; mimeType: string }[] : [];

      for (const file of files) {
        try {
          const fileRes = await fetch(file.url);
          if (!fileRes.ok) continue;
          const buf    = await fileRes.arrayBuffer();
          const label  = slug(q.title.replace(/fotografía\s*\d+\s*/i, '').replace(/[()]/g, '').trim() || q.title);
          const fname  = `${String(idx).padStart(2, '0')}_${label}${ext(file.name, file.mimeType) || '.' + file.name.split('.').pop()}`;
          zip.file(fname, buf);
          idx++;
        } catch { /* skip file on error */ }
      }
    }

    const content = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });

    return new Response(content.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(zipName)}.zip"`,
        'Content-Length': String(content.length),
      },
    });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

