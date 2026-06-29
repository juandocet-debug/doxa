import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSession, AuthError } from '@/lib/session-helper';
import { SUPER_ADMIN_ID, VERIFICADOR_ID } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

export async function POST(req: Request) {
  try {
    const currentUserId = await requireSession();

    const formData = await req.formData();
    const tallySubmissionId = formData.get('tallySubmissionId') as string;
    const formId = formData.get('formId') as string;
    const questionId = formData.get('questionId') as string || null;
    const tallyFileUrl = formData.get('tallyFileUrl') as string;
    const tallyFileName = formData.get('tallyFileName') as string || null;
    const motivo = formData.get('motivo') as string;
    const file = formData.get('file') as File | null;

    if (!tallySubmissionId || !formId || !tallyFileUrl || !motivo || !file) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // Validate that the tallyFileUrl belongs to this submission and form in Tally
    const tallyApiUrl = process.env.TALLY_API_URL || 'https://api.tally.so';
    const tallyApiKey = process.env.TALLY_API_KEY;
    if (!tallyApiKey) {
      return NextResponse.json({ error: 'Configuración de Tally incompleta en el servidor' }, { status: 500 });
    }

    const tallyRes = await fetch(`${tallyApiUrl}/forms/${formId}/submissions?limit=500`, {
      headers: { Authorization: `Bearer ${tallyApiKey}` },
      cache: 'no-store',
    });
    if (!tallyRes.ok) {
      return NextResponse.json({ error: 'No se pudieron verificar los datos en Tally' }, { status: 502 });
    }
    const tallyData = await tallyRes.json();
    const submissionsList = (tallyData.submissions ?? tallyData.data?.submissions ?? []) as { id: string; responses?: { questionId: string; answer: unknown }[] }[];
    const submission = submissionsList.find((s) => s.id === tallySubmissionId);
    if (!submission) {
      return NextResponse.json({ error: 'El envío no existe en Tally o no coincide con los parámetros' }, { status: 400 });
    }

    const cleanUrl = (u: string) => {
      try {
        const parsed = new URL(u);
        return parsed.origin + parsed.pathname;
      } catch {
        return u;
      }
    };

    const targetClean = cleanUrl(tallyFileUrl);

    // Extract all file URLs in this submission
    const fileUrls: string[] = [];
    for (const resp of submission.responses ?? []) {
      if (Array.isArray(resp.answer)) {
        for (const f of resp.answer) {
          if (f && typeof f === 'object' && 'url' in f) {
            fileUrls.push(f.url as string);
          }
        }
      }
    }

    const hasMatch = fileUrls.some(u => cleanUrl(u) === targetClean);
    if (!hasMatch) {
      return NextResponse.json({ error: 'La URL del archivo no pertenece a este envío en Tally' }, { status: 400 });
    }

    // 2. Control de acceso: si no es superadmin ni verificador (con poderes globales), verificar que el formId pertenece al componente del usuario
    const hasGlobalAccess = currentUserId === SUPER_ADMIN_ID || currentUserId === VERIFICADOR_ID;
    if (!hasGlobalAccess) {
      const tallyForm = await prisma.tallyFormulario.findUnique({
        where: { tallyFormId: formId }
      });
      if (!tallyForm || tallyForm.componenteId !== currentUserId) {
        return NextResponse.json({ error: 'No está autorizado para modificar evidencias de este formulario' }, { status: 403 });
      }
    }

    // 3. Validar archivo
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'El archivo supera el límite de tamaño de 15MB' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Formato de archivo no permitido. Solo se aceptan imágenes y PDFs.' }, { status: 400 });
    }

    // 4. Subir a Cloudinary
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await uploadToCloudinary(buffer, file.name, file.type);

    // 5. Transacción de base de datos
    const result = await prisma.$transaction(async (tx) => {
      // Marcar reemplazos anteriores de este mismo archivo en esta submission como inactivos
      await tx.evidenciaTallyReemplazo.updateMany({
        where: {
          tallySubmissionId,
          tallyFileUrl,
          active: true,
        },
        data: {
          active: false,
        },
      });

      // Crear el nuevo registro de reemplazo activo
      return await tx.evidenciaTallyReemplazo.create({
        data: {
          tallySubmissionId,
          formId,
          questionId,
          tallyFileUrl,
          tallyFileName,
          replacementUrl: uploadResult.url,
          replacementPublicId: uploadResult.publicId,
          replacementName: file.name,
          replacementMime: file.type,
          replacementSize: file.size,
          motivo,
          replacedBy: currentUserId,
          active: true,
        },
      });
    });

    return NextResponse.json({ success: true, replacement: result });

  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    console.error('Error replacing evidence:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
