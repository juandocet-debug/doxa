import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { COMPONENTES } from '@/lib/componentes';
import { requireUserSession, checkComponentPermission, AuthError } from '@/lib/session-helper';
import { syncSubmissionSnapshot } from '@/lib/sync-service';
import { DoxaPermisoComponente } from '@prisma/client';
import { SubmisionEvidencia } from '@/lib/evidencias/types';
import { fetchSubmissions, extractAnswer, extractFiles } from '@/lib/evidencias/tally-fetch';
import { cleanUrl } from '@/lib/evidencias/archive-resolver';
import { deleteSubmission, deleteClase } from '@/lib/evidencias/delete-service';

export async function GET(req: Request) {
  try {
    const session = await requireUserSession();

    const { searchParams } = new URL(req.url);
    const filterComponente = searchParams.get('componente');
    const filterGrupo = searchParams.get('grupo');

    const filterDesde = searchParams.get('desde');
    const filterHasta = searchParams.get('hasta');

    let componentes = COMPONENTES;
    if (filterComponente) {
      componentes = COMPONENTES.filter((c) => c.id === filterComponente);
    }

    if (!session.isSuperAdmin && session.usuario) {
      const permittedIds = new Set(
        session.usuario.permisos
          .filter((p: DoxaPermisoComponente) => p.puedeVer)
          .map((p: DoxaPermisoComponente) => p.componenteId)
      );
      componentes = componentes.filter((c) => permittedIds.has(c.id));
    }

    // 1. Fetch Tally submissions in parallel
    const fetchedResults = await Promise.all(
      componentes.map(async (comp) => {
        try {
          const res = await fetchSubmissions(comp.formId);
          return { comp, data: res, error: null };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Error';
          return { comp, data: null, error: msg };
        }
      })
    );

    // 2. Gather all submission IDs
    const allSubIds: string[] = [];
    for (const result of fetchedResults) {
      if (result.data) {
        allSubIds.push(...result.data.submissions.map((s) => s.id));
      }
    }

    // 3. Batch query database for all deleted submission IDs
    const deletedSubs = await prisma.tallyDeletedSubmission.findMany({
      where: { tallySubmissionId: { in: allSubIds } },
      select: { tallySubmissionId: true }
    });
    const deletedSubIdsSet = new Set(deletedSubs.map(d => d.tallySubmissionId));

    // 4. Batch query database for all submission approvals in 1 query
    const aprobaciones = await prisma.aprobacionTally.findMany({
      where: { tallySubmissionId: { in: allSubIds } }
    });
    const aprobMap = new Map<string, typeof aprobaciones[0]>(
      aprobaciones.map((a) => [a.tallySubmissionId, a])
    );

    // Query active Cloudinary replacements
    const replacements = await prisma.evidenciaTallyReemplazo.findMany({
      where: {
        tallySubmissionId: { in: allSubIds },
        active: true,
      },
    });
    const replacementMap = new Map<string, typeof replacements[0]>();
    for (const r of replacements) {
      replacementMap.set(cleanUrl(r.tallyFileUrl), r);
    }

    // Query Tally archive snapshots
    const archives = await prisma.tallyArchivoSnapshot.findMany({
      where: {
        tallySubmissionId: { in: allSubIds }
      }
    });
    const archiveMap = new Map<string, typeof archives[0]>();
    for (const a of archives) {
      archiveMap.set(cleanUrl(a.tallyFileUrl), a);
    }

    // Query Tally submission snapshots
    const snapshots = await prisma.tallySubmissionSnapshot.findMany({
      where: { tallySubmissionId: { in: allSubIds } }
    });
    const snapshotMap = new Map<string, typeof snapshots[0]>();
    for (const s of snapshots) {
      snapshotMap.set(s.tallySubmissionId, s);
    }

    const allSubmissions: SubmisionEvidencia[] = [];

    // 4. Map results and build responses
    for (const result of fetchedResults) {
      if (result.error || !result.data) continue;
      const { comp } = result;
      const { questions, submissions } = result.data;

      const grupoQ = questions.find(
        (q) => q.title?.toLowerCase().includes('grupo') || q.title?.toLowerCase().includes('selecciona')
      );
      const claseQ = questions.find(
        (q) => q.title?.toLowerCase().includes('clase') || q.title?.toLowerCase().includes('número')
      );
      const fotoQs = questions.filter((q) => q.type === 'FILE_UPLOAD');

      for (const sub of submissions) {
        if (deletedSubIdsSet.has(sub.id)) continue;

        const getResp = (qId: string) =>
          sub.responses.find((r) => r.questionId === qId)?.answer;

        const grupo = grupoQ ? extractAnswer(getResp(grupoQ.id)) : '';
        const clase = claseQ ? extractAnswer(getResp(claseQ.id)) : '';

        const fechaEnvio = sub.submittedAt ?? sub.createdAt;
        if (filterDesde && new Date(fechaEnvio) < new Date(filterDesde)) continue;
        if (filterHasta && new Date(fechaEnvio) > new Date(filterHasta + 'T23:59:59')) continue;

        if (filterGrupo && grupo !== filterGrupo) continue;

        const fotos = fotoQs.map((q) => {
          const files = extractFiles(getResp(q.id));
          const archivos = files.map((file) => {
            const fileClean = cleanUrl(file.url);
            const repl = replacementMap.get(fileClean);
            if (repl) {
              return {
                id: file.id,
                name: repl.replacementName || file.name,
                url: repl.replacementUrl,
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
              return {
                id: file.id,
                name: arch.tallyFileName || file.name,
                url: arch.cloudinaryUrl,
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

        const aprobacion = aprobMap.get(sub.id);

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

        const canBackup = await checkComponentPermission(session, comp.id, 'puedeSincronizarBackup');
        if (canBackup) {
          const existingSnapshot = snapshotMap.get(sub.id);
          const subFiles = archives.filter((a) => a.tallySubmissionId === sub.id);
          const hasUnsynced = subFiles.length === 0 || subFiles.some((f) => f.syncStatus !== 'synced');

          if (!existingSnapshot || hasUnsynced) {
            syncSubmissionSnapshot(comp.formId, sub.id).catch((err) => {
              console.error(`Automatic background backup failed for ${sub.id}:`, err);
            });
          }
        }
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

export async function DELETE(req: Request) {
  try {
    const session = await requireUserSession();
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get('submissionId');
    const clase = searchParams.get('clase');

    let targetComponentId: string | null = null;

    if (submissionId) {
      const snap = await prisma.tallySubmissionSnapshot.findUnique({
        where: { tallySubmissionId: submissionId }
      });
      if (snap) {
        targetComponentId = snap.componenteId;
      }
    } else if (clase) {
      const snap = await prisma.tallySubmissionSnapshot.findFirst({
        where: { clase }
      });
      if (snap) {
        targetComponentId = snap.componenteId;
      }
    }

    if (targetComponentId) {
      const isAuthorized = await checkComponentPermission(session, targetComponentId, 'puedeAprobar');
      if (!isAuthorized) {
        return NextResponse.json({ error: 'No autorizado para eliminar en este componente' }, { status: 403 });
      }
    } else {
      if (!session.isSuperAdmin) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    const sessionUserId = session.isSuperAdmin ? null : session.userId;

    if (submissionId) {
      await deleteSubmission(submissionId, sessionUserId, targetComponentId);
      return NextResponse.json({ success: true, message: `Entrega ${submissionId} y sus archivos en Cloudinary eliminados` });
    }

    if (clase) {
      await deleteClase(clase, sessionUserId, targetComponentId);
      return NextResponse.json({ success: true, message: `Clase ${clase} y sus archivos en Cloudinary eliminados` });
    }

    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
