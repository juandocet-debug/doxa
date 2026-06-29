import { NextResponse } from 'next/server';
import { getSubmissions } from '@/lib/tally-api';
import { prisma } from '@/lib/db';
import { requireSession, AuthError } from '@/lib/session-helper';
import { SUPER_ADMIN_ID } from '@/lib/auth';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUserId = await requireSession();
    const isSuperAdmin = currentUserId === SUPER_ADMIN_ID;

    const { id } = await params;

    // Access control: Ensure coordinator owns this form
    if (!isSuperAdmin) {
      const tallyForm = await prisma.tallyFormulario.findUnique({
        where: { tallyFormId: id }
      });
      if (!tallyForm || tallyForm.componenteId !== currentUserId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

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

    // Query synced snapshots for this form
    const archives = await prisma.tallyArchivoSnapshot.findMany({
      where: {
        formId: id,
        syncStatus: 'synced'
      }
    });
    const archiveMap = new Map<string, typeof archives[0]>();
    for (const a of archives) {
      archiveMap.set(cleanUrl(a.tallyFileUrl), a);
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

