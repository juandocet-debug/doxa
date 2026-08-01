import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { COMPONENTES } from '@/lib/componentes';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { requireUserSession, checkComponentPermission, logAuditoria, AuthError } from '@/lib/session-helper';
import { fetchSubmissions, invalidateCache } from '@/lib/evidencias/tally-fetch';
import { cleanUrl } from '@/lib/evidencias/archive-resolver';

type DeleteEvidenceBody = {
  formId: string;
  tallySubmissionId: string;
  questionId?: string | null;
  questionLabel?: string | null;
  tallyFileUrl: string;
  tallyFileName?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

type ReviewEvidenceBody = {
  formId: string;
  tallySubmissionId: string;
  questionId?: string | null;
  questionLabel?: string | null;
  tallyFileUrl: string;
  tallyFileName?: string | null;
  estadoRevision: 'pendiente' | 'cumple' | 'no_cumple';
  observacionRevision?: string | null;
};

function isManualUrl(url: string) {
  return url.startsWith('manual://');
}

export async function PATCH(req: Request) {
  try {
    const session = await requireUserSession();
    const body = await req.json() as ReviewEvidenceBody;
    const {
      formId,
      tallySubmissionId,
      questionId = null,
      questionLabel = null,
      tallyFileUrl,
      tallyFileName = null,
      estadoRevision,
      observacionRevision = null,
    } = body;

    if (!formId || !tallySubmissionId || !tallyFileUrl || !estadoRevision) {
      return NextResponse.json({ error: 'Faltan datos para revisar la evidencia.' }, { status: 400 });
    }

    if (!['pendiente', 'cumple', 'no_cumple'].includes(estadoRevision)) {
      return NextResponse.json({ error: 'Estado de revision no valido.' }, { status: 400 });
    }

    if (estadoRevision === 'no_cumple' && !observacionRevision?.trim()) {
      return NextResponse.json({ error: 'La observacion es obligatoria cuando la evidencia no cumple.' }, { status: 400 });
    }

    const component = COMPONENTES.find((c) => c.formId === formId);
    if (!component) {
      return NextResponse.json({ error: 'Componente no valido.' }, { status: 400 });
    }

    const canReview =
      await checkComponentPermission(session, component.id, 'puedeRevisarEvidencia') ||
      await checkComponentPermission(session, component.id, 'puedeAprobar') ||
      await checkComponentPermission(session, component.id, 'puedeDevolver') ||
      (session.isSuperCoordinador && await checkComponentPermission(session, component.id, 'puedeVer'));

    if (!canReview) {
      return NextResponse.json({ error: 'No autorizado para revisar evidencias en este componente.' }, { status: 403 });
    }

    let snapshot = await prisma.tallySubmissionSnapshot.findUnique({ where: { tallySubmissionId } });
    if (!snapshot) {
      snapshot = await prisma.tallySubmissionSnapshot.create({
        data: {
          tallySubmissionId,
          formId,
          componenteId: component.id,
          componenteNombre: component.nombre,
          rawJson: { reviewBootstrap: true },
        },
      });
    }

    const reviewedAt = estadoRevision === 'pendiente' ? null : new Date();
    const archive = await prisma.tallyArchivoSnapshot.upsert({
      where: { tallyFileUrl },
      update: {
        snapshotId: snapshot.id,
        tallySubmissionId,
        formId,
        questionId,
        questionLabel,
        tallyFileName,
        estadoRevision,
        observacionRevision: estadoRevision === 'no_cumple' ? observacionRevision?.trim() : null,
        revisadoPor: reviewedAt ? session.userId : null,
        revisadoAt: reviewedAt,
      },
      create: {
        snapshotId: snapshot.id,
        tallySubmissionId,
        formId,
        questionId,
        questionLabel,
        tallyFileName,
        tallyFileUrl,
        syncStatus: 'pending',
        estadoRevision,
        observacionRevision: estadoRevision === 'no_cumple' ? observacionRevision?.trim() : null,
        revisadoPor: reviewedAt ? session.userId : null,
        revisadoAt: reviewedAt,
      },
    });

    await logAuditoria({
      usuarioId: session.isSuperAdmin ? null : session.userId,
      accion: estadoRevision === 'cumple' ? 'EVIDENCIA_CUMPLE' : estadoRevision === 'no_cumple' ? 'EVIDENCIA_NO_CUMPLE' : 'EVIDENCIA_REVISION_PENDIENTE',
      componenteId: component.id,
      formId,
      tallySubmissionId,
      detalle: `${tallyFileName || tallyFileUrl}: ${estadoRevision}${observacionRevision ? ` - ${observacionRevision}` : ''}`,
    });

    invalidateCache(formId);
    return NextResponse.json({ success: true, archive });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error('Error reviewing evidence file:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireUserSession();
    const body = await req.json() as DeleteEvidenceBody;
    const {
      formId,
      tallySubmissionId,
      questionId = null,
      questionLabel = null,
      tallyFileUrl,
      tallyFileName = null,
      mimeType = null,
      size = null,
    } = body;

    if (!formId || !tallySubmissionId || !tallyFileUrl) {
      return NextResponse.json({ error: 'Faltan datos para eliminar la evidencia.' }, { status: 400 });
    }

    const component = COMPONENTES.find((c) => c.formId === formId);
    if (!component) {
      return NextResponse.json({ error: 'Componente no valido.' }, { status: 400 });
    }

    const isAuthorized = await checkComponentPermission(session, component.id, 'puedeEliminarEvidencia');
    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado para eliminar evidencias en este componente.' }, { status: 403 });
    }

    if (isManualUrl(tallyFileUrl)) {
      const manual = await prisma.tallyArchivoSnapshot.findUnique({ where: { tallyFileUrl } });
      if (!manual || manual.tallySubmissionId !== tallySubmissionId || manual.formId !== formId) {
        return NextResponse.json({ error: 'Evidencia manual no encontrada.' }, { status: 404 });
      }

      if (manual.cloudinaryPublicId) {
        await deleteFromCloudinary(manual.cloudinaryPublicId).catch((err) => console.error('Cloudinary destroy err:', err));
      }

      await prisma.tallyArchivoSnapshot.delete({ where: { id: manual.id } });
      await logAuditoria({
        usuarioId: session.isSuperAdmin ? null : session.userId,
        accion: 'ELIMINAR_EVIDENCIA_MANUAL',
        componenteId: component.id,
        formId,
        tallySubmissionId,
        detalle: `Se elimino evidencia manual: ${manual.tallyFileName || tallyFileName || tallyFileUrl}`,
      });
      return NextResponse.json({ success: true });
    }

    const tallyData = await fetchSubmissions(formId);
    const sub = tallyData.submissions.find((item) => item.id === tallySubmissionId);
    if (!sub) {
      return NextResponse.json({ error: 'Entrega no encontrada en Tally.' }, { status: 404 });
    }

    const targetClean = cleanUrl(tallyFileUrl);
    let foundFile: { questionId: string; name?: string; mimeType?: string; size?: number } | null = null;
    for (const resp of sub.responses ?? []) {
      if (!Array.isArray(resp.answer)) continue;
      for (const file of resp.answer) {
        if (!file || typeof file !== 'object' || !('url' in file)) continue;
        const fileUrl = String((file as { url: string }).url);
        if (cleanUrl(fileUrl) === targetClean && (!questionId || resp.questionId === questionId)) {
          foundFile = {
            questionId: resp.questionId,
            name: (file as { name?: string }).name,
            mimeType: (file as { mimeType?: string }).mimeType,
            size: (file as { size?: number }).size,
          };
          break;
        }
      }
      if (foundFile) break;
    }

    if (!foundFile) {
      return NextResponse.json({ error: 'La evidencia no pertenece a esta entrega.' }, { status: 400 });
    }

    let snapshot = await prisma.tallySubmissionSnapshot.findUnique({ where: { tallySubmissionId } });
    if (!snapshot) {
      snapshot = await prisma.tallySubmissionSnapshot.create({
        data: {
          tallySubmissionId,
          formId,
          componenteId: component.id,
          componenteNombre: component.nombre,
          rawJson: { deletedFileBootstrap: true },
        },
      });
    }

    const existing = await prisma.tallyArchivoSnapshot.findUnique({ where: { tallyFileUrl } });
    if (existing?.formId && existing.formId !== formId) {
      return NextResponse.json({ error: 'La evidencia no coincide con el formulario.' }, { status: 400 });
    }

    const replacements = await prisma.evidenciaTallyReemplazo.findMany({
      where: {
        tallySubmissionId,
        tallyFileUrl,
        active: true,
        ...(questionId ? { questionId } : {}),
      },
    });
    await Promise.all(
      replacements
        .map((replacement) => replacement.replacementPublicId)
        .filter((id): id is string => !!id)
        .map((id) => deleteFromCloudinary(id).catch((err) => console.error('Cloudinary replacement destroy err:', err)))
    );
    await prisma.evidenciaTallyReemplazo.deleteMany({
      where: {
        tallySubmissionId,
        tallyFileUrl,
        active: true,
        ...(questionId ? { questionId } : {}),
      },
    });

    if (existing?.cloudinaryPublicId) {
      await deleteFromCloudinary(existing.cloudinaryPublicId).catch((err) => console.error('Cloudinary destroy err:', err));
    }

    await prisma.tallyArchivoSnapshot.upsert({
      where: { tallyFileUrl },
      update: {
        snapshotId: snapshot.id,
        tallySubmissionId,
        formId,
        questionId: questionId || foundFile.questionId,
        questionLabel,
        tallyFileName: tallyFileName || foundFile.name || existing?.tallyFileName,
        tallyMime: mimeType || foundFile.mimeType || existing?.tallyMime,
        tallySize: size ?? foundFile.size ?? existing?.tallySize,
        cloudinaryUrl: null,
        cloudinaryPublicId: null,
        cloudinaryMime: null,
        cloudinarySize: null,
        syncStatus: 'deleted',
        syncError: null,
        syncedAt: null,
      },
      create: {
        snapshotId: snapshot.id,
        tallySubmissionId,
        formId,
        questionId: questionId || foundFile.questionId,
        questionLabel,
        tallyFileName: tallyFileName || foundFile.name || null,
        tallyFileUrl,
        tallyMime: mimeType || foundFile.mimeType || null,
        tallySize: size ?? foundFile.size ?? null,
        syncStatus: 'deleted',
      },
    });

    invalidateCache(formId);
    await logAuditoria({
      usuarioId: session.isSuperAdmin ? null : session.userId,
      accion: 'ELIMINAR_EVIDENCIA_TALLY',
      componenteId: component.id,
      formId,
      tallySubmissionId,
      detalle: `Se oculto/eliminó evidencia de Tally: ${tallyFileName || foundFile.name || tallyFileUrl}`,
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error('Error deleting evidence file:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 });
  }
}
