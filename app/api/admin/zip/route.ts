import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { prisma } from '@/lib/db';
import { requireUserSession, checkComponentPermission, logAuditoria, AuthError } from '@/lib/session-helper';
import { COMPONENTES } from '@/lib/componentes';

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
    const session = await requireUserSession();

    const { searchParams } = new URL(req.url);
    const formId       = searchParams.get('formId');
    const submissionId = searchParams.get('submissionId');
    const zipName      = searchParams.get('zipName') || 'evidencias';

    if (!formId || !submissionId) {
      return NextResponse.json({ error: 'Faltan parametros' }, { status: 400 });
    }

    // Resolve component from formId
    const component = COMPONENTES.find(c => c.formId === formId);
    if (!component) {
      return NextResponse.json({ error: 'Componente no válido' }, { status: 400 });
    }

    // Verify permission on backend
    const isAuthorized = await checkComponentPermission(session, component.id, 'puedeExportar');
    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
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

    const cleanUrl = (u: string) => {
      try {
        const parsed = new URL(u);
        return parsed.origin + parsed.pathname;
      } catch {
        return u;
      }
    };

    const replacements = await prisma.evidenciaTallyReemplazo.findMany({
      where: {
        tallySubmissionId: submissionId,
        active: true,
      },
    });
    const replacementMap = new Map<string, typeof replacements[0]>();
    for (const r of replacements) {
      replacementMap.set(cleanUrl(r.tallyFileUrl), r);
    }

    const archives = await prisma.tallyArchivoSnapshot.findMany({
      where: {
        tallySubmissionId: submissionId,
        syncStatus: 'synced'
      }
    });
    const archiveMap = new Map<string, typeof archives[0]>();
    for (const a of archives) {
      archiveMap.set(cleanUrl(a.tallyFileUrl), a);
    }

    const downloadQueue: { qTitle: string; file: { url: string; name: string; mimeType: string } }[] = [];
    for (const q of fotoQs) {
      const resp = sub.responses.find(r => r.questionId === q.id);
      const files = Array.isArray(resp?.answer) ? resp.answer as { url: string; name: string; mimeType: string }[] : [];
      for (const file of files) {
        const fileClean = cleanUrl(file.url);
        const repl = replacementMap.get(fileClean);
        const arch = archiveMap.get(fileClean);

        const resolvedFile = repl ? {
          url: repl.replacementUrl,
          name: repl.replacementName || file.name,
          mimeType: repl.replacementMime || file.mimeType
        } : (arch && arch.cloudinaryUrl ? {
          url: arch.cloudinaryUrl,
          name: arch.tallyFileName || file.name,
          mimeType: arch.cloudinaryMime || file.mimeType
        } : file);

        downloadQueue.push({ qTitle: q.title, file: resolvedFile });
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

    // Write audit trail
    await logAuditoria({
      usuarioId: session.isSuperAdmin ? null : session.userId,
      accion: 'EXPORTAR_ZIP',
      componenteId: component.id,
      formId,
      tallySubmissionId: submissionId,
      detalle: `Exportación de evidencias en formato ZIP: ${zipName}`
    });

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

