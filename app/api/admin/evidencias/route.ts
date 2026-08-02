import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { COMPONENTES } from '@/lib/componentes';
import { requireUserSession, checkComponentPermission, AuthError, ensureTallyRealActivityDateColumn } from '@/lib/session-helper';
import { DoxaPermisoComponente } from '@prisma/client';
import { SubmisionMetadata } from '@/lib/evidencias/types';
import { fetchSubmissions, extractAnswer, invalidateCache } from '@/lib/evidencias/tally-fetch';
import { deleteSubmission, deleteClase } from '@/lib/evidencias/delete-service';
import { getSubmissionFileUrls } from '@/lib/evidencias/file-groups';
import { cleanUrl } from '@/lib/evidencias/archive-resolver';
import { addArchiveReviewToSummary, createReviewSummary } from '@/lib/evidencias/review-state';

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    const session = await requireUserSession();
    await ensureTallyRealActivityDateColumn();

    const { searchParams } = new URL(req.url);
    const filterComponente = searchParams.get('componente');
    const filterGrupo = searchParams.get('grupo');
    const filterClase = searchParams.get('clase');
    const filterDesde = searchParams.get('desde');
    const filterHasta = searchParams.get('hasta');
    const filterEstado = searchParams.get('estado'); // 'pendiente' | 'aprobada' | 'rechazada'

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10));

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
    const tStartFetch = Date.now();
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
    const tFetchMs = Date.now() - tStartFetch;

    // 2. Gather all submission IDs
    const allSubIds: string[] = [];
    for (const result of fetchedResults) {
      if (result.data) {
        allSubIds.push(...result.data.submissions.map((s) => s.id));
      }
    }

    // 3. Batch query database for all deleted submission IDs, approvals and backup snapshots
    const tStartPrisma = Date.now();
    const [deletedSubs, aprobaciones, archivosSnapshot, submissionSnapshots] = await Promise.all([
      prisma.tallyDeletedSubmission.findMany({
        where: { tallySubmissionId: { in: allSubIds } },
        select: { tallySubmissionId: true }
      }),
      prisma.aprobacionTally.findMany({
        where: { tallySubmissionId: { in: allSubIds } }
      }),
      prisma.tallyArchivoSnapshot.findMany({
        where: { tallySubmissionId: { in: allSubIds } },
        select: { tallySubmissionId: true, tallyFileUrl: true, cloudinaryUrl: true, syncStatus: true, estadoRevision: true }
      }),
      prisma.tallySubmissionSnapshot.findMany({
        where: { tallySubmissionId: { in: allSubIds } },
        select: { tallySubmissionId: true, fechaActividadReal: true, formId: true, grupo: true, clase: true }
      })
    ]);
    const tPrismaMs = Date.now() - tStartPrisma;

    const deletedSubIdsSet = new Set(deletedSubs.map(d => d.tallySubmissionId));
    const aprobMap = new Map<string, typeof aprobaciones[0]>(
      aprobaciones.map((a) => [a.tallySubmissionId, a])
    );
    const snapshotMap = new Map<string, typeof submissionSnapshots[0]>(
      submissionSnapshots.map((snap) => [snap.tallySubmissionId, snap])
    );
    const classDateKey = (formId: string, grupo: string, clase: string) => [formId, grupo || 'Sin grupo', clase || 'Sin clase'].join('::');
    const realDateByClass = new Map<string, Date>();
    for (const snap of submissionSnapshots) {
      if (!snap.fechaActividadReal) continue;
      realDateByClass.set(classDateKey(snap.formId, snap.grupo || '', snap.clase || ''), snap.fechaActividadReal);
    }
    const archiveBySubmission = new Map<string, Map<string, typeof archivosSnapshot[number]>>();
    for (const archive of archivosSnapshot) {
      if (archive.syncStatus === 'deleted') continue;
      const byUrl = archiveBySubmission.get(archive.tallySubmissionId) ?? new Map<string, typeof archive>();
      byUrl.set(cleanUrl(archive.tallyFileUrl), archive);
      archiveBySubmission.set(archive.tallySubmissionId, byUrl);
    }

    const mappedSubmissions: SubmisionMetadata[] = [];
    const clasesConEnvio = new Set<string>();
    const estadoPorClase = new Map<string, string>();

    // 4. Map results and filter basic metadata
    const tStartMap = Date.now();
    for (const result of fetchedResults) {
      if (result.error || !result.data) continue;
      const { comp } = result;
      const { questions, submissions } = result.data;

      const grupoQs = questions.filter(
        (q) => q.title?.toLowerCase().includes('grupo') || q.title?.toLowerCase().includes('selecciona')
      );
      const claseQs = questions.filter(
        (q) => q.title?.toLowerCase().includes('clase') || q.title?.toLowerCase().includes('número')
      );

      for (const sub of submissions) {
        if (deletedSubIdsSet.has(sub.id)) continue;

        const getResp = (qIds: string[]) => {
          const resp = sub.responses.find((r) => qIds.includes(r.questionId));
          return resp ? resp.answer : undefined;
        };

        const grupo = grupoQs.length > 0 ? extractAnswer(getResp(grupoQs.map(q => q.id))) : '';
        const clase = claseQs.length > 0 ? extractAnswer(getResp(claseQs.map(q => q.id))) : '';
        const fechaEnvio = sub.submittedAt ?? sub.createdAt;
        const fechaActividadReal = snapshotMap.get(sub.id)?.fechaActividadReal ?? realDateByClass.get(classDateKey(comp.formId, grupo, clase)) ?? null;
        const fechaOperacion = fechaActividadReal?.toISOString() ?? fechaEnvio;
        const aprobacion = aprobMap.get(sub.id);
        const estado = (aprobacion?.estado as 'pendiente' | 'aprobada' | 'rechazada') ?? 'pendiente';
        const fileUrls = getSubmissionFileUrls(sub.responses, questions);
        const archiveMap = archiveBySubmission.get(sub.id);
        const reviewSummary = createReviewSummary();
        let backupStatus: SubmisionMetadata['backupStatus'] = 'empty';
        if (fileUrls.length > 0) {
          let syncedCount = 0;
          let hasFailure = false;
          for (const url of fileUrls) {
            const archive = archiveMap?.get(url);
            if (archive?.syncStatus === 'failed') hasFailure = true;
            if (archive?.syncStatus === 'synced' && archive.cloudinaryUrl) syncedCount += 1;
            if (archive?.syncStatus === 'deleted') continue;
            addArchiveReviewToSummary(reviewSummary, archive);
          }
          backupStatus = hasFailure ? 'failed' : syncedCount === fileUrls.length ? 'synced' : syncedCount > 0 ? 'partial' : 'pending';
        }
        for (const archive of archiveMap?.values() ?? []) {
          if (!archive.tallyFileUrl.startsWith('manual://')) continue;
          addArchiveReviewToSummary(reviewSummary, archive);
        }

        // Keep track of all classes and statuses for tabs
        if (clase) {
          clasesConEnvio.add(clase);
          // Standard tab highlighting logic: approve > reject > pending
          const currentStatus = estadoPorClase.get(clase);
          if (!currentStatus || currentStatus === 'pendiente' || (currentStatus === 'rechazada' && estado === 'aprobada')) {
            estadoPorClase.set(clase, estado);
          }
        }

        // Apply filters
        if (filterClase && clase !== filterClase) continue;
        if (filterGrupo && grupo !== filterGrupo) continue;
        if (filterDesde && new Date(fechaOperacion) < new Date(filterDesde)) continue;
        if (filterHasta && new Date(fechaOperacion) > new Date(filterHasta + 'T23:59:59')) continue;
        if (filterEstado && estado !== filterEstado) continue;

        mappedSubmissions.push({
          submissionId: sub.id,
          formId: comp.formId,
          componenteId: comp.id,
          componenteNombre: comp.nombre,
          grupo,
          clase,
          fechaEnvio,
          fechaActividadReal: fechaActividadReal?.toISOString() ?? null,
          estado,
          backupStatus,
          reviewSummary,
          notas: aprobacion?.notas ?? null,
        });
      }
    }

    mappedSubmissions.sort(
      (a, b) => new Date(b.fechaActividadReal ?? b.fechaEnvio).getTime() - new Date(a.fechaActividadReal ?? a.fechaEnvio).getTime()
    );

    const total = mappedSubmissions.length;
    const paginated = mappedSubmissions.slice((page - 1) * pageSize, page * pageSize);
    const tMapMs = Date.now() - tStartMap;

    const totalMs = Date.now() - startTime;
    console.log(`[GET /api/admin/evidencias] fetch tally: ${tFetchMs}ms, prisma: ${tPrismaMs}ms, map: ${tMapMs}ms, total request: ${totalMs}ms`);

    return NextResponse.json({
      submissions: paginated,
      page,
      pageSize,
      total,
      hasNext: page * pageSize < total,
      clasesConEnvio: Array.from(clasesConEnvio),
      estadoPorClase: Object.fromEntries(estadoPorClase)
    });
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
    const componenteParam = searchParams.get('componente');

    if ((clase || submissionId) && !session.puedeEliminarClases) {
      return NextResponse.json({ error: 'No autorizado para eliminar entregas o clases completas' }, { status: 403 });
    }

    let targetComponentId: string | null = componenteParam || null;
    let formIdToInvalidate: string | null = null;

    if (submissionId) {
      const snap = await prisma.tallySubmissionSnapshot.findUnique({
        where: { tallySubmissionId: submissionId }
      });
      if (snap) {
        targetComponentId = snap.componenteId;
        formIdToInvalidate = snap.formId;
      }
    } else if (clase) {
      const snap = await prisma.tallySubmissionSnapshot.findFirst({
        where: { 
          clase,
          ...(componenteParam ? { componenteId: componenteParam } : {})
        }
      });
      if (snap) {
        targetComponentId = snap.componenteId;
        formIdToInvalidate = snap.formId;
      }
    }

    if (targetComponentId) {
      const isAuthorized = await checkComponentPermission(session, targetComponentId, 'puedeVer');
      if (!isAuthorized) {
        return NextResponse.json({ error: 'No autorizado para eliminar en este componente' }, { status: 403 });
      }
    } else {
      if (!session.puedeEliminarClases) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    const sessionUserId = session.isSuperAdmin ? null : session.userId;

    if (submissionId) {
      await deleteSubmission(submissionId, sessionUserId, targetComponentId);
      if (formIdToInvalidate) invalidateCache(formIdToInvalidate);
      return NextResponse.json({ success: true, message: `Entrega ${submissionId} y sus archivos en Cloudinary eliminados` });
    }

    if (clase) {
      await deleteClase(clase, sessionUserId, targetComponentId);
      if (formIdToInvalidate) invalidateCache(formIdToInvalidate);
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
