import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { prisma } from '@/lib/db';
import { requireUserSession, checkComponentPermission, logAuditoria, AuthError } from '@/lib/session-helper';
import { COMPONENTES } from '@/lib/componentes';
import { getSubmissionFileGroups } from '@/lib/evidencias/file-groups';
import { syncSubmissionSnapshot } from '@/lib/sync-service';

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
    }

    const canSyncBackup = await checkComponentPermission(session, component.id, 'puedeSincronizarBackup');

    // Obtener submissions con URLs frescas
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

    if (canSyncBackup) {
      try {
        await syncSubmissionSnapshot(formId, submissionId);
      } catch (backupError) {
        console.error('No se pudo sincronizar respaldo antes de exportar:', backupError);
      }
    }

    const fileGroups = getSubmissionFileGroups(sub.responses, questions);

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
    const legacyReplacementMap = new Map<string, typeof replacements[0]>();
    const replacementKey = (questionId: string | null | undefined, url: string) => `${questionId ?? ''}::${cleanUrl(url)}`;
    for (const r of replacements) {
      if (r.questionId) {
        replacementMap.set(replacementKey(r.questionId, r.tallyFileUrl), r);
      } else {
        legacyReplacementMap.set(cleanUrl(r.tallyFileUrl), r);
      }
    }

    const archives = await prisma.tallyArchivoSnapshot.findMany({
      where: { tallySubmissionId: submissionId }
    });
    const archiveMap = new Map<string, typeof archives[0]>();
    for (const a of archives) {
      archiveMap.set(cleanUrl(a.tallyFileUrl), a);
    }

    const downloadQueue: { qTitle: string; file: { url: string; name: string; mimeType: string } }[] = [];
    for (const group of fileGroups) {
      for (const file of group.archivos) {
        const fileClean = cleanUrl(file.url);
        const repl = replacementMap.get(replacementKey(group.questionId, file.url)) ?? (!group.questionId ? legacyReplacementMap.get(fileClean) : undefined);
        const arch = archiveMap.get(fileClean);
        if (arch?.syncStatus === 'deleted') continue;

        const resolvedFile = repl ? {
          url: repl.replacementUrl,
          name: repl.replacementName || file.name,
          mimeType: repl.replacementMime || file.mimeType
        } : (arch && arch.syncStatus === 'synced' && arch.cloudinaryUrl ? {
          url: arch.cloudinaryUrl,
          name: arch.tallyFileName || file.name,
          mimeType: arch.cloudinaryMime || file.mimeType
        } : file);

        downloadQueue.push({ qTitle: group.label, file: resolvedFile });
      }
    }

    for (const item of archives.filter(a => a.syncStatus === 'synced' && a.tallyFileUrl.startsWith('manual://') && a.cloudinaryUrl)) {
      downloadQueue.push({
        qTitle: item.questionLabel || 'Lista de asistencia manual',
        file: {
          url: item.cloudinaryUrl || '',
          name: item.tallyFileName || 'evidencia-manual',
          mimeType: item.cloudinaryMime || item.tallyMime || 'application/octet-stream',
        },
      });
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

