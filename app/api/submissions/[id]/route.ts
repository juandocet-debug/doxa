import { NextResponse } from 'next/server';
import { getSubmissions } from '@/lib/tally-api';
import { prisma } from '@/lib/db';
import { requireUserSession, checkComponentPermission, AuthError } from '@/lib/session-helper';
import { syncSubmissionSnapshot } from '@/lib/sync-service';
import { COMPONENTES } from '@/lib/componentes';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUserSession();
    const { id } = await params;

    // Resolve component from formId
    const component = COMPONENTES.find(c => c.formId === id);
    if (!component) {
      return NextResponse.json({ error: 'Componente no válido' }, { status: 400 });
    }

    // Verify permission on backend
    const isAuthorized = await checkComponentPermission(session, component.id, 'puedeVer');
    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Check if user has permission to synchronize backup
    const canBackup = await checkComponentPermission(session, component.id, 'puedeSincronizarBackup');

    const data = await getSubmissions(id);

    const cleanUrl = (u: string) => {
      try {
        const parsed = new URL(u);
        return parsed.origin + parsed.pathname;
      } catch {
        return u;
      }
    };

    // Query active replacements for this form
    const replacements = await prisma.evidenciaTallyReemplazo.findMany({
      where: {
        formId: id,
        active: true
      }
    });
    const replacementMap = new Map<string, typeof replacements[0]>();
    for (const r of replacements) {
      replacementMap.set(cleanUrl(r.tallyFileUrl), r);
    }

    // Query snapshots for this form
    const archives = await prisma.tallyArchivoSnapshot.findMany({
      where: {
        formId: id
      }
    });
    const archiveMap = new Map<string, typeof archives[0]>();
    for (const a of archives) {
      if (a.syncStatus === 'synced') {
        archiveMap.set(cleanUrl(a.tallyFileUrl), a);
      }
    }

    const snapshots = await prisma.tallySubmissionSnapshot.findMany({
      where: { formId: id }
    });
    const snapshotMap = new Map<string, typeof snapshots[0]>();
    for (const s of snapshots) {
      snapshotMap.set(s.tallySubmissionId, s);
    }

    // Apply replacements and snapshot URLs to the responses
    if (data.submissions) {
      data.submissions = data.submissions.map(sub => {
        const responses = sub.responses.map(resp => {
          if (Array.isArray(resp.answer)) {
            const answer = resp.answer.map((file: unknown) => {
              if (file && typeof file === 'object' && 'url' in file) {
                const f = file as { url: string; name?: string; mimeType?: string; size?: number };
                const fileClean = cleanUrl(f.url);
                const repl = replacementMap.get(fileClean);
                if (repl) {
                  return {
                    ...f,
                    name: repl.replacementName || f.name,
                    url: repl.replacementUrl,
                    mimeType: repl.replacementMime || f.mimeType,
                    size: repl.replacementSize || f.size,
                    isReplaced: true,
                    originalUrl: f.url,
                    originalName: f.name
                  };
                }

                const arch = archiveMap.get(fileClean);
                if (arch && arch.cloudinaryUrl) {
                  return {
                    ...f,
                    name: arch.tallyFileName || f.name,
                    url: arch.cloudinaryUrl,
                    mimeType: arch.cloudinaryMime || f.mimeType,
                    size: arch.cloudinarySize || f.size,
                    isSynced: true,
                    originalUrl: f.url
                  };
                }
              }
              return file;
            });
            return { ...resp, answer };
          }
          return resp;
        });
        // Trigger automatic background sync/backup if snapshot is missing or has unsynced files
        // and the user has 'puedeSincronizarBackup' permission.
        if (canBackup) {
          const existingSnapshot = snapshotMap.get(sub.id);
          const subFiles = archives.filter((a) => a.tallySubmissionId === sub.id);
          const hasUnsynced = subFiles.length === 0 || subFiles.some((f) => f.syncStatus !== 'synced');

          if (!existingSnapshot || hasUnsynced) {
            syncSubmissionSnapshot(id, sub.id).catch((err) => {
              console.error(`Automatic background backup failed for ${sub.id}:`, err);
            });
          }
        }

        return { ...sub, responses };
      });
    }

    return NextResponse.json(data);
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error desconocido' }, { status: 500 });
  }
}

