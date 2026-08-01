import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { prisma } from '@/lib/db';
import { COMPONENTES } from '@/lib/componentes';
import { requireUserSession, checkComponentPermission, AuthError, ensureTallyRealActivityDateColumn } from '@/lib/session-helper';
import { fetchSubmissions, extractAnswer } from '@/lib/evidencias/tally-fetch';
import { getSubmissionFileGroups } from '@/lib/evidencias/file-groups';
import { cleanUrl } from '@/lib/evidencias/archive-resolver';

type ReportRow = {
  submissionId: string;
  grupo: string;
  clase: string;
  fecha: Date;
  estado: string;
  notas: string | null;
  archivos: { label: string; name: string; estado: string; observacion: string | null }[];
};

function safeDate(value: string | null, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addPageIfNeeded(doc: PDFKit.PDFDocument, space = 90) {
  if (doc.y + space > 790) doc.addPage();
}

export async function GET(req: Request) {
  try {
    const session = await requireUserSession();
    await ensureTallyRealActivityDateColumn();
    const { searchParams } = new URL(req.url);
    const componenteId = searchParams.get('componente');
    const grupoFilter = searchParams.get('grupo') || '';
    const claseFilter = searchParams.get('clase') || '';
    const desdeRaw = searchParams.get('desde');
    const hastaRaw = searchParams.get('hasta');
    const desde = safeDate(desdeRaw);
    const hasta = safeDate(hastaRaw, true);

    if (!componenteId) return NextResponse.json({ error: 'Falta el componente' }, { status: 400 });
    if ((desdeRaw && !desde) || (hastaRaw && !hasta) || (desde && hasta && desde > hasta)) {
      return NextResponse.json({ error: 'El rango de fechas no es válido' }, { status: 400 });
    }

    const component = COMPONENTES.find((item) => item.id === componenteId);
    if (!component) return NextResponse.json({ error: 'Componente no válido' }, { status: 400 });
    const canView = await checkComponentPermission(session, component.id, 'puedeVer');
    if (!canView || (!session.isSuperAdmin && !session.isSuperCoordinador)) {
      return NextResponse.json({ error: 'Solo superadmin o super coordinador pueden descargar el acta PDF' }, { status: 403 });
    }

    const tallyData = await fetchSubmissions(component.formId);
    const submissionIds = tallyData.submissions.map((item) => item.id);
    const [snapshots, approvals, archives, deleted] = await Promise.all([
      prisma.tallySubmissionSnapshot.findMany({ where: { tallySubmissionId: { in: submissionIds } } }),
      prisma.aprobacionTally.findMany({ where: { tallySubmissionId: { in: submissionIds } } }),
      prisma.tallyArchivoSnapshot.findMany({ where: { tallySubmissionId: { in: submissionIds }, syncStatus: { not: 'deleted' } } }),
      prisma.tallyDeletedSubmission.findMany({ where: { tallySubmissionId: { in: submissionIds } }, select: { tallySubmissionId: true } }),
    ]);
    const snapshotMap = new Map(snapshots.map((item) => [item.tallySubmissionId, item]));
    const approvalMap = new Map(approvals.map((item) => [item.tallySubmissionId, item]));
    const deletedSet = new Set(deleted.map((item) => item.tallySubmissionId));
    const archivesBySubmission = new Map<string, Map<string, typeof archives[number]>>();
    for (const archive of archives) {
      const map = archivesBySubmission.get(archive.tallySubmissionId) ?? new Map<string, typeof archive>();
      map.set(cleanUrl(archive.tallyFileUrl), archive);
      archivesBySubmission.set(archive.tallySubmissionId, map);
    }

    const grupoQuestions = tallyData.questions.filter((q) => q.title?.toLowerCase().includes('grupo') || q.title?.toLowerCase().includes('selecciona'));
    const claseQuestions = tallyData.questions.filter((q) => q.title?.toLowerCase().includes('clase') || q.title?.toLowerCase().includes('número') || q.title?.toLowerCase().includes('numero'));
    const rows: ReportRow[] = [];

    for (const submission of tallyData.submissions) {
      if (deletedSet.has(submission.id)) continue;
      const answerFor = (ids: string[]) => extractAnswer(submission.responses.find((response) => ids.includes(response.questionId))?.answer);
      const snapshot = snapshotMap.get(submission.id);
      const grupo = answerFor(grupoQuestions.map((q) => q.id)) || snapshot?.grupo || 'Sin grupo';
      const clase = answerFor(claseQuestions.map((q) => q.id)) || snapshot?.clase || 'Sin clase';
      const fecha = snapshot?.fechaActividadReal ?? new Date(submission.submittedAt ?? submission.createdAt);
      if (grupoFilter && grupo !== grupoFilter) continue;
      if (claseFilter && clase !== claseFilter) continue;
      if (desde && fecha < desde) continue;
      if (hasta && fecha > hasta) continue;

      const archiveMap = archivesBySubmission.get(submission.id);
      const archivos = getSubmissionFileGroups(submission.responses, tallyData.questions).flatMap((group) =>
        group.archivos.map((file) => {
          const archive = archiveMap?.get(cleanUrl(file.url));
          return {
            label: group.label,
            name: file.name,
            estado: archive?.estadoRevision === 'cumple' ? 'CUMPLE' : archive?.estadoRevision === 'no_cumple' ? 'NO CUMPLE' : 'SIN REVISAR',
            observacion: archive?.observacionRevision ?? null,
          };
        })
      );
      const approval = approvalMap.get(submission.id);
      rows.push({ submissionId: submission.id, grupo, clase, fecha, estado: approval?.estado || 'pendiente', notas: approval?.notas ?? null, archivos });
    }
    rows.sort((a, b) => a.grupo.localeCompare(b.grupo, 'es') || a.clase.localeCompare(b.clase, 'es', { numeric: true }) || a.fecha.getTime() - b.fecha.getTime());

    const totalFiles = rows.reduce((sum, row) => sum + row.archivos.length, 0);
    const cumple = rows.reduce((sum, row) => sum + row.archivos.filter((file) => file.estado === 'CUMPLE').length, 0);
    const noCumple = rows.reduce((sum, row) => sum + row.archivos.filter((file) => file.estado === 'NO CUMPLE').length, 0);
    const doc = new PDFDocument({ margin: 42, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve) => {
      doc.on('end', resolve);
      doc.font('Helvetica-Bold').fontSize(17).text('ACTA GENERAL DE REVISIÓN DE EVIDENCIAS DOXA', { align: 'center' });
      doc.moveDown(.4).font('Helvetica').fontSize(9).text(`Generada: ${new Date().toLocaleString('es-CO')}`, { align: 'center' });
      doc.moveDown().moveTo(42, doc.y).lineTo(553, doc.y).stroke().moveDown();
      doc.font('Helvetica-Bold').fontSize(11).text('Filtros aplicados');
      doc.font('Helvetica').fontSize(9).text(`Componente: ${component.nombre}`).text(`Grupo: ${grupoFilter || 'Todos'}`).text(`Clase: ${claseFilter || 'Todas'}`).text(`Periodo: ${desdeRaw || 'Sin límite'} a ${hastaRaw || 'Sin límite'}`);
      doc.moveDown().font('Helvetica-Bold').fontSize(11).text('Resumen');
      doc.font('Helvetica').fontSize(9).text(`Entregas: ${rows.length}  |  Archivos: ${totalFiles}  |  Cumple: ${cumple}  |  No cumple: ${noCumple}  |  Sin revisar: ${totalFiles - cumple - noCumple}`);
      doc.moveDown();

      if (rows.length === 0) doc.font('Helvetica-Oblique').text('No se encontraron entregas para los filtros seleccionados.');
      for (const [rowIndex, row] of rows.entries()) {
        addPageIfNeeded(doc, 100);
        doc.font('Helvetica-Bold').fontSize(10).text(`${rowIndex + 1}. ${row.grupo} · ${row.clase}`);
        doc.font('Helvetica').fontSize(8.5).text(`Fecha de actividad/carga: ${row.fecha.toLocaleDateString('es-CO')}  |  Estado: ${row.estado.toUpperCase()}  |  Entrega: ${row.submissionId}`);
        if (row.notas) doc.text(`Observación general: ${row.notas}`);
        if (row.archivos.length === 0) doc.font('Helvetica-Oblique').text('Sin archivos detectados.');
        row.archivos.forEach((file, fileIndex) => {
          addPageIfNeeded(doc, 46);
          doc.font('Helvetica-Bold').fontSize(8.5).text(`  ${fileIndex + 1}. ${file.label}: `, { continued: true }).font('Helvetica').text(file.name);
          doc.text(`     Revisión: ${file.estado}${file.observacion ? ` — ${file.observacion}` : ''}`);
        });
        doc.moveDown(.65).moveTo(42, doc.y).lineTo(553, doc.y).strokeColor('#CCCCCC').stroke().strokeColor('#000000').moveDown(.55);
      }

      addPageIfNeeded(doc, 50);
      doc.font('Helvetica').fontSize(8).text(`Revisor: ${session.isSuperAdmin ? 'Super Administrador' : session.usuario?.nombre || session.userId}`).text('Este documento consolida únicamente las evidencias visibles según los filtros y permisos aplicados.');
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(i);
        doc.fontSize(7).text(`Página ${i + 1} de ${range.count}`, 42, 810, { width: 511, align: 'right' });
      }
      doc.end();
    });

    const pdf = Buffer.concat(chunks);
    return new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="acta-general-evidencias.pdf"', 'Content-Length': String(pdf.length), 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Error generating filtered evidence report:', error);
    return NextResponse.json({ error: 'Error al generar el acta general' }, { status: 500 });
  }
}
