import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { prisma } from '@/lib/db';
import { COMPONENTES } from '@/lib/componentes';
import { requireUserSession, checkComponentPermission, AuthError } from '@/lib/session-helper';
import { fetchSubmissions } from '@/lib/evidencias/tally-fetch';
import { getSubmissionFileGroups } from '@/lib/evidencias/file-groups';
import { cleanUrl } from '@/lib/evidencias/archive-resolver';

function textValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '-';
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUserSession();
    const { id: submissionId } = await params;
    const { searchParams } = new URL(req.url);
    const formId = searchParams.get('formId');

    if (!formId) {
      return NextResponse.json({ error: 'Falta formId' }, { status: 400 });
    }

    const component = COMPONENTES.find((c) => c.formId === formId);
    if (!component) {
      return NextResponse.json({ error: 'Componente no valido' }, { status: 400 });
    }

    const canView = await checkComponentPermission(session, component.id, 'puedeVer');
    if (!canView || (!session.isSuperAdmin && !session.isSuperCoordinador)) {
      return NextResponse.json({ error: 'Solo superadmin o super coordinador pueden descargar el acta PDF' }, { status: 403 });
    }

    const [tallyData, snapshot, aprobacion, archives] = await Promise.all([
      fetchSubmissions(formId),
      prisma.tallySubmissionSnapshot.findUnique({ where: { tallySubmissionId: submissionId } }),
      prisma.aprobacionTally.findUnique({ where: { tallySubmissionId: submissionId } }),
      prisma.tallyArchivoSnapshot.findMany({ where: { tallySubmissionId: submissionId } }),
    ]);

    const submission = tallyData.submissions.find((sub) => sub.id === submissionId);
    if (!submission) {
      return NextResponse.json({ error: 'Entrega no encontrada en Tally' }, { status: 404 });
    }

    const archiveByUrl = new Map(archives.map((archive) => [cleanUrl(archive.tallyFileUrl), archive]));
    const fileGroups = getSubmissionFileGroups(submission.responses, tallyData.questions);
    const totalFiles = fileGroups.reduce((count, group) => count + group.archivos.length, 0);
    const cumple = archives.filter((archive) => archive.estadoRevision === 'cumple').length;
    const noCumple = archives.filter((archive) => archive.estadoRevision === 'no_cumple').length;

    const doc = new PDFDocument({ margin: 44, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve) => {
      doc.on('end', resolve);

      doc.fontSize(17).font('Helvetica-Bold').text('ACTA DE REVISION DE EVIDENCIAS DOXA', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica').text(`Generado: ${new Date().toLocaleString('es-CO')}`, { align: 'center' });
      doc.moveDown();
      doc.moveTo(44, doc.y).lineTo(551, doc.y).stroke();
      doc.moveDown();

      doc.fontSize(12).font('Helvetica-Bold').text('Datos de la entrega');
      doc.moveDown(0.4);
      const info: [string, string][] = [
        ['Componente', component.nombre],
        ['Grupo', textValue(snapshot?.grupo)],
        ['Clase', textValue(snapshot?.clase)],
        ['Formulario', formId],
        ['Entrega Tally', submissionId],
        ['Estado clase/entrega', aprobacion?.estado || 'pendiente'],
        ['Observacion general', aprobacion?.notas || '-'],
        ['Fecha de carga', new Date(submission.submittedAt ?? submission.createdAt).toLocaleString('es-CO')],
      ];
      for (const [label, value] of info) {
        doc.fontSize(9).font('Helvetica-Bold').text(`${label}: `, { continued: true });
        doc.font('Helvetica').text(value);
      }

      doc.moveDown();
      doc.fontSize(12).font('Helvetica-Bold').text('Resumen');
      doc.fontSize(9).font('Helvetica')
        .text(`Archivos detectados: ${totalFiles}`)
        .text(`Evidencias marcadas como cumple: ${cumple}`)
        .text(`Evidencias devueltas/no cumple: ${noCumple}`);
      doc.moveDown();

      doc.fontSize(12).font('Helvetica-Bold').text('Detalle por evidencia');
      doc.moveDown(0.4);

      let index = 1;
      for (const group of fileGroups) {
        for (const file of group.archivos) {
          const archive = archiveByUrl.get(cleanUrl(file.url));
          const status = archive?.estadoRevision === 'cumple'
            ? 'CUMPLE'
            : archive?.estadoRevision === 'no_cumple'
              ? 'NO CUMPLE'
              : 'SIN REVISAR';

          if (doc.y > 720) doc.addPage();
          doc.fontSize(10).font('Helvetica-Bold').text(`${index}. ${group.label}`);
          doc.fontSize(8.5).font('Helvetica')
            .text(`Archivo: ${file.name}`)
            .text(`Estado: ${status}`)
            .text(`Backup: ${archive?.syncStatus || 'pendiente'}`);
          if (archive?.observacionRevision) {
            doc.text(`Observacion: ${archive.observacionRevision}`);
          }
          doc.moveDown(0.5);
          index += 1;
        }
      }

      doc.moveTo(44, doc.y).lineTo(551, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica')
        .text(`Revisor: ${session.isSuperAdmin ? 'Super Administrador' : session.usuario?.nombre || session.userId}`)
        .text('Este documento consolida la revision registrada en DOXA.');

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="acta-revision-${submissionId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error generating evidence review PDF:', error);
    return NextResponse.json({ error: 'Error al generar PDF de revision' }, { status: 500 });
  }
}
