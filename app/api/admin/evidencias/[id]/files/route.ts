import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { COMPONENTES } from '@/lib/componentes';
import { requireUserSession, AuthError } from '@/lib/session-helper';
import { fetchSubmissions } from '@/lib/evidencias/tally-fetch';
import { getSubmissionFileGroups } from '@/lib/evidencias/file-groups';
import { cleanUrl } from '@/lib/evidencias/archive-resolver';

function correctionPending(
  replacement: { replacedAt: Date },
  archive: { estadoRevision: string; revisadoAt: Date | null } | null | undefined,
) {
  if (!archive) return true;
  if (archive.estadoRevision === 'pendiente') return true;
  return archive.estadoRevision === 'no_cumple' && (!archive.revisadoAt || replacement.replacedAt > archive.revisadoAt);
}

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

    // Gather all files by Tally question. Repeated labels (Lista de asistencia)
    // keep separate groups so each uploaded attendance sheet remains visible.
    const fileGroups = getSubmissionFileGroups(sub.responses, questions);

    const [replacements, archives] = await Promise.all([
      prisma.evidenciaTallyReemplazo.findMany({
        where: { tallySubmissionId: submissionId, active: true }
      }),
      prisma.tallyArchivoSnapshot.findMany({
        where: { tallySubmissionId: submissionId }
      })
    ]);

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

    const archiveMap = new Map<string, typeof archives[0]>();
    for (const a of archives) {
      archiveMap.set(cleanUrl(a.tallyFileUrl), a);
    }

    const manualArchives = archives.filter((a) => a.syncStatus !== 'deleted' && a.tallyFileUrl.startsWith('manual://') && a.cloudinaryUrl);

    const fotos = fileGroups.map((group) => {
      const archivos = group.archivos.map((file) => {
        const fileClean = cleanUrl(file.url);
        const arch = archiveMap.get(fileClean);
        if (arch?.syncStatus === 'deleted') return null;

        const repl = replacementMap.get(replacementKey(group.questionId, file.url)) ?? (!group.questionId ? legacyReplacementMap.get(fileClean) : undefined);
        if (repl) {
          const pendingCorrection = correctionPending(repl, arch);
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
            questionId: group.questionId,
            correctionPending: pendingCorrection,
            estadoRevision: pendingCorrection ? 'pendiente' : arch?.estadoRevision || 'pendiente',
            observacionRevision: arch?.observacionRevision || null,
          };
        }

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
            questionId: group.questionId,
            estadoRevision: arch.estadoRevision || 'pendiente',
            observacionRevision: arch.observacionRevision || null,
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
          questionId: group.questionId,
          estadoRevision: arch ? arch.estadoRevision : 'pendiente',
          observacionRevision: arch ? arch.observacionRevision : null,
        };
      }).filter((archivo): archivo is NonNullable<typeof archivo> => Boolean(archivo));

      return {
        label: group.label,
        archivos,
      };
    });

    const manualGroups = new Map<string, typeof manualArchives>();
    for (const item of manualArchives) {
      const label = item.questionLabel || 'Lista de asistencia manual';
      const group = manualGroups.get(label) ?? [];
      group.push(item);
      manualGroups.set(label, group);
    }

    for (const [label, items] of manualGroups) {
      fotos.push({
        label,
        archivos: items.map((item) => {
          let optimizedUrl = item.cloudinaryUrl || '';
          const isImage = item.cloudinaryMime?.startsWith('image/');
          if (isImage && optimizedUrl.includes('/upload/')) {
            optimizedUrl = optimizedUrl.replace('/upload/', '/upload/w_300,q_auto,f_auto/');
          }
          return {
            id: item.tallyFileId || item.id,
            name: item.tallyFileName || 'evidencia-manual',
            url: optimizedUrl,
            downloadUrl: item.cloudinaryUrl || optimizedUrl,
            mimeType: item.cloudinaryMime || item.tallyMime || 'application/octet-stream',
            size: item.cloudinarySize || item.tallySize || 0,
            isSynced: true,
            isManual: true,
            syncStatus: item.syncStatus,
            syncError: item.syncError,
            originalUrl: item.tallyFileUrl,
            questionId: item.questionId || 'manual-attendance',
            estadoRevision: item.estadoRevision || 'pendiente',
            observacionRevision: item.observacionRevision || null,
          };
        }),
      });
    }

    return NextResponse.json({ fotos });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
