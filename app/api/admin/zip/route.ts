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
    const hasGlobalRead = isSuperAdmin || currentUserId === 'verificador';

    const { searchParams } = new URL(req.url);
    const formId       = searchParams.get('formId');
    const submissionId = searchParams.get('submissionId');
    const zipName      = searchParams.get('zipName') || 'evidencias';

    if (!formId || !submissionId) {
      return NextResponse.json({ error: 'Faltan parametros' }, { status: 400 });
    }

    // Access control: Ensure coordinator owns this form
    if (!hasGlobalRead) {
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



    const downloadQueue: { qTitle: string; file: { url: string; name: string; mimeType: string } }[] = [];
    for (const q of fotoQs) {
      const resp = sub.responses.find(r => r.questionId === q.id);
      const files = Array.isArray(resp?.answer) ? resp.answer as { url: string; name: string; mimeType: string }[] : [];
      for (const file of files) {
        downloadQueue.push({ qTitle: q.title, file });
      }
    }

    const downloadedFiles = await Promise.allSettled(
      downloadQueue.map(async (item, i) => {
        const fileRes = await fetch(item.file.url, { signal: AbortSignal.timeout(8000) });
        if (!fileRes.ok) throw new Error(`Download status ${fileRes.status}`);
        const buf = await fileRes.arrayBuffer();
        return { item, buf, index: i + 1 };
      })
    );

    const zip = new JSZip();
    for (const result of downloadedFiles) {
      if (result.status === 'fulfilled') {
        const { item, buf, index } = result.value;
        const label  = slug(item.qTitle.replace(/fotografía\s*\d+\s*/i, '').replace(/[()]/g, '').trim() || item.qTitle);
        const fname  = `${String(index).padStart(2, '0')}_${label}${ext(item.file.name, item.file.mimeType) || '.' + item.file.name.split('.').pop()}`;
        zip.file(fname, buf);
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

