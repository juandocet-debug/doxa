import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { COMPONENTES } from '@/lib/componentes';
import { requireSession, AuthError } from '@/lib/session-helper';
import { SUPER_ADMIN_ID } from '@/lib/auth';
import { syncSubmissionSnapshot } from '@/lib/sync-service';

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

interface CacheEntry {
  data: {
    questions: { id: string; title: string; type: string }[];
    submissions: {
      id: string;
      submittedAt: string;
      createdAt: string;
      responses: { questionId: string; answer: unknown }[];
    }[];
  };
  timestamp: number;
}

const tallyCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 20 * 1000; // 20 seconds short-term cache

async function fetchSubmissions(formId: string) {
  const cached = tallyCache.get(formId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const res = await fetch(`${API}/forms/${formId}/submissions?limit=500`, {
    headers: { Authorization: `Bearer ${KEY}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Tally API ${res.status} for form ${formId}`);
  const data = await res.json();
  const parsed = {
    questions: (data.questions ?? []) as { id: string; title: string; type: string }[],
    submissions: (data.submissions ?? []) as {
      id: string;
      submittedAt: string;
      createdAt: string;
      responses: { questionId: string; answer: unknown }[];
    }[],
  };

  tallyCache.set(formId, { data: parsed, timestamp: Date.now() });
  return parsed;
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

    const filterDesde = searchParams.get('desde');
    const filterHasta = searchParams.get('hasta');

    // Access control: Non-superadmin is locked to their own component
    const targetComponente = hasGlobalRead ? filterComponente : currentUserId;

    const componentes = targetComponente
      ? COMPONENTES.filter((c) => c.id === targetComponente)
      : COMPONENTES;

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

    const cleanUrl = (u: string) => {
      try {
        const parsed = new URL(u);
        return parsed.origin + parsed.pathname;
      } catch {
        return u;
      }
    };

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

        // Trigger automatic background sync/backup if snapshot is missing or has unsynced files
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
    const currentUserId = await requireSession();
    const isSuperAdmin = currentUserId === SUPER_ADMIN_ID;
    const hasWrite = isSuperAdmin || currentUserId === 'verificador';

    if (!hasWrite) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get('submissionId');
    const clase = searchParams.get('clase');

    if (submissionId) {
      // Record as permanently deleted
      await prisma.tallyDeletedSubmission.upsert({
        where: { tallySubmissionId: submissionId },
        update: {},
        create: { tallySubmissionId: submissionId }
      });

      await prisma.tallySubmissionSnapshot.deleteMany({
        where: { tallySubmissionId: submissionId }
      });
      await prisma.aprobacionTally.deleteMany({
        where: { tallySubmissionId: submissionId }
      });
      await prisma.evidenciaTallyReemplazo.deleteMany({
        where: { tallySubmissionId: submissionId }
      });
      return NextResponse.json({ success: true, message: `Entrega ${submissionId} eliminada` });
    }

    if (clase) {
      const snapshots = await prisma.tallySubmissionSnapshot.findMany({
        where: { clase },
        select: { tallySubmissionId: true }
      });
      const submissionIds = snapshots.map(s => s.tallySubmissionId);

      // Record all these submissionIds as permanently deleted
      await Promise.all(
        submissionIds.map(subId =>
          prisma.tallyDeletedSubmission.upsert({
            where: { tallySubmissionId: subId },
            update: {},
            create: { tallySubmissionId: subId }
          })
        )
      );

      await prisma.tallySubmissionSnapshot.deleteMany({
        where: { clase }
      });
      await prisma.aprobacionTally.deleteMany({
        where: { tallySubmissionId: { in: submissionIds } }
      });
      await prisma.evidenciaTallyReemplazo.deleteMany({
        where: { tallySubmissionId: { in: submissionIds } }
      });
      return NextResponse.json({ success: true, message: `Clase ${clase} eliminada` });
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
