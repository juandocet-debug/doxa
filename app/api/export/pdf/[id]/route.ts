import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import PDFDocument from 'pdfkit';
import { requireSession, AuthError } from '@/lib/session-helper';
import { SUPER_ADMIN_ID } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUserId = await requireSession();
    const isSuperAdmin = currentUserId === SUPER_ADMIN_ID;
    const hasGlobalRead = isSuperAdmin || currentUserId === 'verificador';

    const { id } = await params;

    // Check component ownership if not superadmin
    const existing = await prisma.registro.findUnique({
      where: { id },
      select: { componenteId: true }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    if (!hasGlobalRead && existing.componenteId !== currentUserId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const registro = await prisma.registro.findUnique({
      where: { id },
      include: {
        meta: true,
        componente: true,
        accion: true,
        instancia: true,
        evidencias: {
          include: {
            evidenciaRequerida: true,
            archivos: { orderBy: { createdAt: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!registro) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve) => {
      doc.on('end', resolve);

      // Header
      doc.fontSize(18).font('Helvetica-Bold')
        .text('SISTEMA DE EVIDENCIAS FOTOGRÁFICAS', { align: 'center' });
      doc.fontSize(12).font('Helvetica')
        .text('Registro de Actividad', { align: 'center' });
      doc.moveDown();

      // Divider
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // General Info
      doc.fontSize(14).font('Helvetica-Bold').text('INFORMACIÓN GENERAL');
      doc.moveDown(0.5);

      const info: [string, string][] = [
        ['ID del Registro', registro.id],
        ['Meta', registro.meta.nombre],
        ['Componente', registro.componente.nombre],
        ['Acción', registro.accion.nombre],
        ['Instancia', registro.instancia?.nombre || 'N/A'],
        ['Fecha de Actividad', new Date(registro.fechaActividad).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })],
        ['Responsable', registro.responsable],
        ['Municipio', registro.municipio],
        ['Localidad', registro.localidad || 'N/A'],
        ['Lugar', registro.lugar || 'N/A'],
        ['Estado', registro.estado.toUpperCase()],
        ['Creado por', registro.createdBy],
        ['Fecha de creación', new Date(registro.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })],
      ];

      for (const [label, value] of info) {
        doc.fontSize(10).font('Helvetica-Bold').text(`${label}: `, { continued: true });
        doc.font('Helvetica').text(value);
      }

      if (registro.observaciones) {
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica-Bold').text('Observaciones: ', { continued: true });
        doc.font('Helvetica').text(registro.observaciones);
      }

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // Evidencias
      doc.fontSize(14).font('Helvetica-Bold').text('EVIDENCIAS');
      doc.moveDown(0.5);

      const totalEvidencias = registro.evidencias.length;
      const cargadas = registro.evidencias.filter((e: { estado: string }) => ['cargada', 'aprobada', 'observada'].includes(e.estado)).length;
      const aprobadas = registro.evidencias.filter((e: { estado: string }) => e.estado === 'aprobada').length;

      doc.fontSize(10).font('Helvetica')
        .text(`Total de evidencias: ${totalEvidencias} | Cargadas: ${cargadas} | Aprobadas: ${aprobadas}`);
      doc.moveDown(0.5);

      registro.evidencias.forEach((ev: { evidenciaRequerida: { nombre: string; obligatorio: boolean }; estado: string; archivos: { nombreOriginal: string; peso: number }[]; observacionRevision?: string | null; reviewedBy?: string | null }, idx: number) => {
        const estadoBadge: Record<string, string> = {
          pendiente: 'PENDIENTE',
          cargada: 'CARGADA',
          aprobada: 'APROBADA',
          observada: 'CON OBSERVACIONES',
          rechazada: 'RECHAZADA',
        };

        doc.fontSize(11).font('Helvetica-Bold')
          .text(`${idx + 1}. ${ev.evidenciaRequerida.nombre}`);
        doc.fontSize(9).font('Helvetica')
          .text(`Estado: ${estadoBadge[ev.estado] || ev.estado}`);
        doc.text(`Archivos cargados: ${ev.archivos.length}`);
        doc.text(`Obligatorio: ${ev.evidenciaRequerida.obligatorio ? 'Sí' : 'No'}`);

        if (ev.observacionRevision) {
          doc.text(`Observación de revisión: ${ev.observacionRevision}`);
        }
        if (ev.reviewedBy) {
          doc.text(`Revisado por: ${ev.reviewedBy}`);
        }

        if (ev.archivos.length > 0) {
          doc.text('Archivos:');
          ev.archivos.forEach((arch: { nombreOriginal: string; peso: number }, aIdx: number) => {
            doc.text(`  ${aIdx + 1}. ${arch.nombreOriginal} (${(arch.peso / 1024).toFixed(1)} KB)`);
          });
        }

        doc.moveDown(0.5);
      });

      // Footer
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica')
        .text(`Generado el ${new Date().toLocaleString('es-CO')}`, { align: 'right' });

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="registro-${id}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 });
  }
}
