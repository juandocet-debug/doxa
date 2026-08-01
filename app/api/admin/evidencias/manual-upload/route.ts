import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { COMPONENTES } from '@/lib/componentes';
import { requireUserSession, checkComponentPermission, logAuditoria, AuthError } from '@/lib/session-helper';
import { uploadToCloudinary } from '@/lib/cloudinary';

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

export async function POST(req: Request) {
  try {
    const session = await requireUserSession();
    const formData = await req.formData();

    const tallySubmissionId = String(formData.get('tallySubmissionId') || '');
    const formId = String(formData.get('formId') || '');
    const grupo = String(formData.get('grupo') || '');
    const clase = String(formData.get('clase') || '');
    const label = String(formData.get('label') || 'Lista de asistencia').trim();
    const motivo = String(formData.get('motivo') || '').trim();
    const file = formData.get('file') as File | null;

    if (!tallySubmissionId || !formId || !label || !file) {
      return NextResponse.json({ error: 'Faltan datos requeridos para la carga manual.' }, { status: 400 });
    }

    const component = COMPONENTES.find((c) => c.formId === formId);
    if (!component) {
      return NextResponse.json({ error: 'Componente no valido.' }, { status: 400 });
    }

    const isAuthorized = await checkComponentPermission(session, component.id, 'puedeReemplazar');
    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado para cargar evidencias manuales en este componente.' }, { status: 403 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'El archivo supera el limite de tamano de 15MB.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Formato no permitido. Solo se aceptan imagenes y PDF.' }, { status: 400 });
    }

    let snapshot = await prisma.tallySubmissionSnapshot.findUnique({
      where: { tallySubmissionId },
    });

    if (snapshot && snapshot.formId !== formId) {
      return NextResponse.json({ error: 'La entrega no coincide con el formulario indicado.' }, { status: 400 });
    }

    if (!snapshot) {
      snapshot = await prisma.tallySubmissionSnapshot.create({
        data: {
          tallySubmissionId,
          formId,
          componenteId: component.id,
          componenteNombre: component.nombre,
          grupo: grupo || null,
          clase: clase || null,
          fechaEnvio: new Date(),
          rawJson: { manualBootstrap: true },
        },
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await uploadToCloudinary(
      buffer,
      file.name,
      file.type,
      `doxa/evidencias/manuales/${formId}/${tallySubmissionId}`,
    );

    const manualId = randomUUID();
    const manualUrl = `manual://${tallySubmissionId}/${manualId}`;

    const archivo = await prisma.tallyArchivoSnapshot.create({
      data: {
        snapshotId: snapshot.id,
        tallySubmissionId,
        formId,
        questionId: 'manual-attendance',
        questionLabel: label,
        tallyFileId: manualId,
        tallyFileName: file.name,
        tallyFileUrl: manualUrl,
        tallyMime: file.type,
        tallySize: file.size,
        cloudinaryUrl: uploadResult.url,
        cloudinaryPublicId: uploadResult.publicId,
        cloudinaryMime: file.type,
        cloudinarySize: file.size,
        syncStatus: 'synced',
        syncedAt: new Date(),
      },
    });

    await logAuditoria({
      usuarioId: session.isSuperAdmin ? null : session.userId,
      accion: 'CARGAR_EVIDENCIA_MANUAL',
      componenteId: component.id,
      formId,
      tallySubmissionId,
      clase: clase || snapshot.clase,
      grupo: grupo || snapshot.grupo,
      detalle: `Carga manual: ${label}. Archivo: ${file.name}. ${motivo ? `Motivo: ${motivo}` : ''}`,
    });

    return NextResponse.json({ success: true, archivo });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error('Error manual-upload:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 });
  }
}
