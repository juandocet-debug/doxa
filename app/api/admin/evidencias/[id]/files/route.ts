import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { COMPONENTES } from '@/lib/componentes';
import { requireUserSession, AuthError } from '@/lib/session-helper';
import { fetchSubmissions, extractFiles } from '@/lib/evidencias/tally-fetch';
import { cleanUrl } from '@/lib/evidencias/archive-resolver';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUserSession();
    const { id: submissionId } = await params;

    let formId: string | null = null;
    let componentId: string | null = null;

    const snap = await prisma.tallySubmissionSnapshot.findUnique({
      where: { tallySubmissionId: submissionId }
    });

    if (snap) {
      formId = snap.formId;
      componentId = snap.componenteId;
    } else {
      for (const comp of COMPONENTES) {
        try {
          const tallyData = await fetchSubmissions(comp.formId);
          if (tallyData.submissions.some(s => s.id === submissionId)) {
            formId = comp.formId;
            componentId = comp.id;
            break;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!formId || !componentId) {
      return NextResponse.json({ error: 'Entrega no encontrada' }, { status: 404 });
    }

    const isAuthorized = session.isSuperAdmin || 
      session.usuario?.permisos?.some((p) => p.componenteId === componentId && p.puedeVer);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const tallyData = await fetchSubmissions(formId);
    const sub = tallyData.submissions.find(s => s.id === submissionId);
    if (!sub) {
      return NextResponse.json({ error: 'Entrega no encontrada en Tally' }, { status: 404 });
    }

    const { questions } = tallyData;
    const fotoQs = questions.filter((q) => q.type === 'FILE_UPLOAD');

    const [replacements, archives] = await Promise.all([
      prisma.evidenciaTallyReemplazo.findMany({
        where: { tallySubmissionId: submissionId, active: true }
      }),
      prisma.tallyArchivoSnapshot.findMany({
        where: { tallySubmissionId: submissionId }
      })
    ]);

    const replacementMap = new Map<string, typeof replacements[0]>();
    for (const r of replacements) {
      replacementMap.set(cleanUrl(r.tallyFileUrl), r);
    }

    const archiveMap = new Map<string, typeof archives[0]>();
    for (const a of archives) {
      archiveMap.set(cleanUrl(a.tallyFileUrl), a);
    }

    const getResp = (qId: string) =>
      sub.responses.find((r) => r.questionId === qId)?.answer;

    const fotos = fotoQs.map((q) => {
      const files = extractFiles(getResp(q.id));
      const archivos = files.map((file) => {
        const fileClean = cleanUrl(file.url);
        const repl = replacementMap.get(fileClean);
        if (repl) {
          let optimizedUrl = repl.replacementUrl;
          const isImage = repl.replacementMime?.startsWith('image/') || file.mimeType?.startsWith('image/');
          if (isImage && optimizedUrl.includes('/upload/')) {
            optimizedUrl = optimizedUrl.replace('/upload/', '/upload/w_300,q_auto,f_auto/');
          }
          return {
            id: file.id,
            name: repl.replacementName || file.name,
            url: optimizedUrl,
            downloadUrl: repl.replacementUrl,
            mimeType: repl.replacementMime || file.mimeType,
            size: repl.replacementSize || file.size,
            isReplaced: true,
            originalUrl: file.url,
            originalName: file.name,
            motivoReemplazo: repl.motivo,
            syncStatus: 'synced',
          };
        }

        const arch = archiveMap.get(fileClean);
        if (arch && arch.syncStatus === 'synced' && arch.cloudinaryUrl) {
          let optimizedUrl = arch.cloudinaryUrl;
          const isImage = arch.cloudinaryMime?.startsWith('image/') || file.mimeType?.startsWith('image/');
          if (isImage && optimizedUrl.includes('/upload/')) {
            optimizedUrl = optimizedUrl.replace('/upload/', '/upload/w_300,q_auto,f_auto/');
          }

          return {
            id: file.id,
            name: arch.tallyFileName || file.name,
            url: optimizedUrl,
            downloadUrl: arch.cloudinaryUrl,
            mimeType: arch.cloudinaryMime || file.mimeType,
            size: arch.cloudinarySize || file.size,
            isSynced: true,
            syncStatus: 'synced',
            originalUrl: file.url,
          };
        }

        return {
          id: file.id,
          name: file.name,
          url: file.url,
          downloadUrl: file.url,
          mimeType: file.mimeType,
          size: file.size,
          isSynced: arch ? arch.syncStatus === 'synced' : false,
          syncStatus: arch ? arch.syncStatus : 'pending',
          syncError: arch ? arch.syncError : null,
          originalUrl: file.url,
        };
      });

      return {
        label: q.title ?? q.id,
        archivos,
      };
    });

    return NextResponse.json({ fotos });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
