export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireSession, AuthError } from '@/lib/session-helper';
import { SUPER_ADMIN_ID } from '@/lib/auth';
import { getStorageService } from '@/src/infrastructure/storage-service';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

async function validateFileHeader(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const arr = new Uint8Array(buffer);

  // JPEG: FF D8 FF
  if (arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) {
    return true;
  }
  // PNG: 89 50 4E 47
  if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47) {
    return true;
  }
  // WebP: RIFF (52 49 46 46) ... WEBP (57 45 42 50)
  if (
    arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 &&
    arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50
  ) {
    return true;
  }
  // PDF: %PDF (25 50 44 46)
  if (arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46) {
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const currentUserId = await requireSession();
    const isSuperAdmin = currentUserId === SUPER_ADMIN_ID;

    const formData = await request.formData();
    const evidenciaCargadaId = formData.get('evidenciaCargadaId') as string;
    const fotos = formData.getAll('fotos') as File[];

    if (!evidenciaCargadaId) {
      return NextResponse.json({ error: 'evidenciaCargadaId es requerido' }, { status: 400 });
    }

    if (!fotos || fotos.length === 0) {
      return NextResponse.json({ error: 'No se recibieron archivos' }, { status: 400 });
    }

    // Verify evidencia exists and fetch related registro
    const evidencia = await prisma.evidenciaCargada.findUnique({
      where: { id: evidenciaCargadaId },
      include: { registro: true },
    });

    if (!evidencia) {
      return NextResponse.json({ error: 'Evidencia no encontrada' }, { status: 404 });
    }

    // Access control: Ensure coordinator owns this registro's component
    if (!isSuperAdmin && evidencia.registro.componenteId !== currentUserId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const storage = getStorageService();
    const savedFilesInfo: { url: string; nombreAlmacenado: string; file: File; ext: string }[] = [];

    // Validation loop
    for (const file of fotos) {
      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: `El archivo ${file.name} supera el limite de 10MB` },
          { status: 400 }
        );
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: `Formato no permitido: ${ext}. Use jpg, jpeg, png, webp o pdf` },
          { status: 400 }
        );
      }

      const isValidHeader = await validateFileHeader(file);
      if (!isValidHeader) {
        return NextResponse.json(
          { error: `El archivo ${file.name} contiene un encabezado MIME inválido o falso` },
          { status: 400 }
        );
      }
    }

    // File storage save & DB transaction
    const savedFilesRecords: unknown[] = [];
    try {
      for (const file of fotos) {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const saved = await storage.saveFile(file, evidenciaCargadaId);
        savedFilesInfo.push({
          url: saved.url,
          nombreAlmacenado: saved.nombreAlmacenado,
          file,
          ext
        });
      }

      // DB write in transaction
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const info of savedFilesInfo) {
          const record = await tx.archivoEvidencia.create({
            data: {
              evidenciaCargadaId,
              nombreOriginal: info.file.name,
              nombreAlmacenado: info.nombreAlmacenado,
              urlArchivo: info.url,
              tipoMime: info.file.type,
              extension: info.ext,
              peso: info.file.size,
              uploadedBy: currentUserId,
            },
          });
          savedFilesRecords.push(record);
        }

        await tx.evidenciaCargada.update({
          where: { id: evidenciaCargadaId },
          data: { estado: 'cargada' },
        });
      });

      return NextResponse.json({ archivos: savedFilesRecords, count: savedFilesRecords.length });
    } catch (dbError) {
      // Cleanup files on error (transaction safety)
      for (const info of savedFilesInfo) {
        try {
          await storage.deleteFile(info.url);
        } catch (cleanupErr) {
          console.error(`Failed to clean up file ${info.url}:`, cleanupErr);
        }
      }
      throw dbError;
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error uploading files:', error);
    return NextResponse.json({ error: 'Error al subir archivos' }, { status: 500 });
  }
}

