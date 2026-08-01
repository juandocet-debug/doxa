import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';
import { prisma } from '@/lib/db';
import { COMPONENTES } from '@/lib/componentes';
import { requireUserSession, checkComponentPermission, AuthError, ensureTallyRealActivityDateColumn } from '@/lib/session-helper';
import { fetchSubmissions, extractAnswer } from '@/lib/evidencias/tally-fetch';
import { getSubmissionFileGroups } from '@/lib/evidencias/file-groups';
import { cleanUrl } from '@/lib/evidencias/archive-resolver';

type ReviewStatus = 'cumple' | 'no_cumple' | 'pendiente';
type ReviewItem = { status: ReviewStatus; observation: string | null; correctionPending: boolean };

type ReportRow = {
  grupo: string;
  clase: string;
  fechas: Date[];
  total: number;
  cumple: number;
  noCumple: number;
  corregidas: number;
  pendientes: number;
  observaciones: string[];
};

const COLOR = {
  ink: '#10231A', muted: '#64746C', green: '#0B7A53', greenSoft: '#E7F6EF',
  amber: '#A85F00', amberSoft: '#FFF4D6', red: '#B42318', redSoft: '#FDECEA',
  line: '#D9E3DD', header: '#073C2B', white: '#FFFFFF', surface: '#F6F9F7',
};

function safeDate(value: string | null, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function classNumber(value: string) {
  return Number(value.match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
}

function formatDateRange(dates: Date[]) {
  const ordered = [...dates].sort((a, b) => a.getTime() - b.getTime());
  if (!ordered.length) return '-';
  const format = (date: Date) => date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const first = format(ordered[0]);
  const last = format(ordered[ordered.length - 1]);
  return first === last ? first : `${first} a ${last}`;
}

function limitWords(value: string | null | undefined, maxWords = 20) {
  return (value || '').trim().split(/\s+/).filter(Boolean).slice(0, maxWords).join(' ') || null;
}

function correctionPending(
  replacement: { replacedAt: Date } | undefined,
  archive: { estadoRevision: string; revisadoAt: Date | null } | undefined,
) {
  if (!replacement) return false;
  if (!archive) return true;
  if (archive.estadoRevision === 'pendiente') return true;
  return archive.estadoRevision === 'no_cumple' && (!archive.revisadoAt || replacement.replacedAt > archive.revisadoAt);
}

function summarize(rows: { grupo: string; clase: string; fecha: Date; reviews: ReviewItem[] }[]) {
  const result = new Map<string, ReportRow>();
  for (const row of rows) {
    const key = `${row.grupo}\u0000${row.clase}`;
    const current = result.get(key) ?? {
      grupo: row.grupo, clase: row.clase, fechas: [], total: 0, cumple: 0, noCumple: 0, corregidas: 0, pendientes: 0, observaciones: [],
    };
    current.fechas.push(row.fecha);
    current.total += row.reviews.length;
    current.cumple += row.reviews.filter((review) => review.status === 'cumple').length;
    current.noCumple += row.reviews.filter((review) => review.status === 'no_cumple').length;
    current.corregidas += row.reviews.filter((review) => review.correctionPending).length;
    current.pendientes += row.reviews.filter((review) => review.status === 'pendiente').length;
    for (const review of row.reviews) {
      const note = limitWords(review.observation);
      if (!note) continue;
      current.observaciones.push(`${review.correctionPending ? 'Corregida' : 'Obs'}: ${note}`);
    }
    result.set(key, current);
  }
  return [...result.values()].sort((a, b) =>
    a.grupo.localeCompare(b.grupo, 'es') || classNumber(a.clase) - classNumber(b.clase) || a.clase.localeCompare(b.clase, 'es')
  );
}

async function createPdf(input: {
  componente: string;
  grupo: string;
  clase: string;
  desde: string | null;
  hasta: string | null;
  revisor: string;
  rows: ReportRow[];
}) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  await new Promise<void>((resolve) => {
    doc.on('end', resolve);
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 72;
    const bottom = doc.page.height - 52;
    const groups = [...new Set(input.rows.map((row) => row.grupo))];
    const total = input.rows.reduce((sum, row) => sum + row.total, 0);
    const cumple = input.rows.reduce((sum, row) => sum + row.cumple, 0);
    const noCumple = input.rows.reduce((sum, row) => sum + row.noCumple, 0);
    const corregidas = input.rows.reduce((sum, row) => sum + row.corregidas, 0);
    const pendientes = input.rows.reduce((sum, row) => sum + row.pendientes, 0);
    const progress = total ? Math.round(((cumple + noCumple) / total) * 100) : 0;

    const addPage = () => {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
      doc.fillColor(COLOR.green).font('Helvetica-Bold').fontSize(9).text('ACTA GENERAL DE REVISIÓN DE EVIDENCIAS', 36, 24);
      doc.moveTo(36, 42).lineTo(pageWidth - 36, 42).strokeColor(COLOR.line).stroke();
      doc.y = 54;
    };

    const columns = [
      { label: 'CLASE', width: 124, align: 'left' as const },
      { label: 'FECHA', width: 88, align: 'left' as const },
      { label: 'TOTAL', width: 44, align: 'center' as const },
      { label: 'CUMPLE', width: 54, align: 'center' as const },
      { label: 'NO CUMPLE', width: 66, align: 'center' as const },
      { label: 'CORREGIDA', width: 70, align: 'center' as const },
      { label: 'SIN REV.', width: 58, align: 'center' as const },
      { label: 'RESULTADO', width: 106, align: 'center' as const },
      { label: 'OBSERVACION', width: contentWidth - 610, align: 'left' as const },
    ];

    const drawTableHeader = () => {
      let x = 36;
      const y = doc.y;
      doc.rect(36, y, contentWidth, 24).fill(COLOR.header);
      for (const column of columns) {
        doc.fillColor(COLOR.white).font('Helvetica-Bold').fontSize(7).text(column.label, x + 8, y + 8, { width: column.width - 16, align: column.align });
        x += column.width;
      }
      doc.y = y + 24;
    };

    const drawGroupHeader = (grupo: string, rows: ReportRow[], continuation = false) => {
      const groupTotal = rows.reduce((sum, row) => sum + row.total, 0);
      const y = doc.y;
      doc.roundedRect(36, y, contentWidth, 32, 6).fill(COLOR.greenSoft);
      doc.fillColor(COLOR.green).font('Helvetica-Bold').fontSize(10).text(`${grupo}${continuation ? ' (continuación)' : ''}`, 48, y + 10, { width: contentWidth - 220 });
      doc.fillColor(COLOR.muted).font('Helvetica').fontSize(8).text(`${rows.length} clases | ${groupTotal} evidencias`, pageWidth - 220, y + 11, { width: 172, align: 'right' });
      doc.y = y + 40;
      drawTableHeader();
    };

    doc.rect(0, 0, pageWidth, 104).fill(COLOR.header);
    doc.fillColor(COLOR.white).font('Helvetica-Bold').fontSize(20).text('ACTA GENERAL DE REVISIÓN DE EVIDENCIAS', 36, 30);
    doc.fillColor('#BDE9D6').font('Helvetica').fontSize(9).text('Resumen ejecutivo por grupo y clase', 36, 59);
    doc.fillColor('#D7F4E8').fontSize(8).text(`Generada: ${new Date().toLocaleString('es-CO')} | Revisor: ${input.revisor}`, 36, 79);

    doc.y = 124;
    doc.fillColor(COLOR.muted).font('Helvetica-Bold').fontSize(7.5).text('COMPONENTE', 36, doc.y);
    doc.fillColor(COLOR.ink).fontSize(11).text(input.componente, 36, doc.y + 12, { width: contentWidth });
    doc.y += 38;

    const scope = [
      `Grupo: ${input.grupo || 'Todos'}`,
      `Clase: ${input.clase || 'Todas'}`,
      input.desde || input.hasta ? `Periodo: ${input.desde || 'Inicio'} a ${input.hasta || 'Hoy'}` : 'Periodo: Todos',
    ].join(' | ');
    doc.roundedRect(36, doc.y, contentWidth, 28, 6).fill(COLOR.surface);
    doc.fillColor(COLOR.muted).font('Helvetica').fontSize(8.5).text(scope, 48, doc.y + 9, { width: contentWidth - 24 });
    doc.y += 44;

    const metrics = [
      ['GRUPOS', groups.length, COLOR.ink], ['CLASES', input.rows.length, COLOR.ink], ['EVIDENCIAS', total, COLOR.ink],
      ['CUMPLE', cumple, COLOR.green], ['NO CUMPLE', noCumple, COLOR.red], ['CORREGIDAS', corregidas, '#2563EB'], ['SIN REVISAR', pendientes, COLOR.amber], ['AVANCE', `${progress}%`, COLOR.green],
    ] as const;
    const gap = 8;
    const width = (contentWidth - gap * (metrics.length - 1)) / metrics.length;
    const metricY = doc.y;
    metrics.forEach(([label, value, color], index) => {
      const x = 36 + index * (width + gap);
      doc.roundedRect(x, metricY, width, 54, 7).fillAndStroke(COLOR.white, COLOR.line);
      doc.fillColor(COLOR.muted).font('Helvetica-Bold').fontSize(6.5).text(label, x + 9, metricY + 10, { width: width - 18 });
      doc.fillColor(color).fontSize(16).text(String(value), x + 9, metricY + 27, { width: width - 18 });
    });
    doc.y = metricY + 72;

    if (!input.rows.length) {
      doc.roundedRect(36, doc.y, contentWidth, 70, 8).fill(COLOR.surface);
      doc.fillColor(COLOR.muted).font('Helvetica').fontSize(11).text('No hay evidencias para los filtros seleccionados.', 36, doc.y + 28, { width: contentWidth, align: 'center' });
    }

    for (const grupo of groups) {
      const groupRows = input.rows.filter((row) => row.grupo === grupo);
      if (doc.y + 76 > bottom) addPage();
      drawGroupHeader(grupo, groupRows);

      for (const [index, row] of groupRows.entries()) {
        const rowHeight = row.observaciones.length ? 44 : 34;
        if (doc.y + rowHeight > bottom) {
          addPage();
          drawGroupHeader(grupo, groupRows, true);
        }
        const y = doc.y;
        if (index % 2 === 1) doc.rect(36, y, contentWidth, rowHeight).fill('#FAFCFB');
        const result = row.noCumple
          ? ['Requiere ajuste', COLOR.red, COLOR.redSoft]
          : row.corregidas
            ? ['Por aprobar', '#2563EB', '#DBEAFE']
            : row.pendientes
              ? ['Pendiente', COLOR.amber, COLOR.amberSoft]
              : ['Revision completa', COLOR.green, COLOR.greenSoft];
        const values = [row.clase, formatDateRange(row.fechas), row.total, row.cumple, row.noCumple, row.corregidas, row.pendientes];
        let x = 36;
        values.forEach((value, valueIndex) => {
          const column = columns[valueIndex];
          const color = valueIndex === 3 ? COLOR.green : valueIndex === 4 ? COLOR.red : valueIndex === 5 ? '#2563EB' : valueIndex === 6 ? COLOR.amber : COLOR.ink;
          doc.fillColor(color).font(valueIndex === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).text(String(value), x + 8, y + 11, { width: column.width - 16, align: column.align });
          x += column.width;
        });
        const resultWidth = columns[7].width;
        doc.roundedRect(x + 7, y + 7, resultWidth - 14, 18, 8).fill(result[2]);
        doc.fillColor(result[1]).font('Helvetica-Bold').fontSize(7.5).text(result[0], x + 12, y + 12, { width: resultWidth - 24, align: 'center' });
        x += resultWidth;
        doc.fillColor(COLOR.muted).font('Helvetica').fontSize(7).text(row.observaciones[0] || '-', x + 8, y + 8, { width: columns[8].width - 16, height: rowHeight - 10 });
        doc.moveTo(36, y + rowHeight).lineTo(36 + contentWidth, y + rowHeight).strokeColor(COLOR.line).stroke();
        doc.y = y + rowHeight;
      }
      doc.y += 14;
    }

    const pageRange = doc.bufferedPageRange();
    for (let pageIndex = 0; pageIndex < pageRange.count; pageIndex += 1) {
      doc.switchToPage(pageIndex);
      const footerY = doc.page.height - 55;
      doc.moveTo(36, footerY - 8).lineTo(doc.page.width - 36, footerY - 8).strokeColor(COLOR.line).stroke();
      doc.fillColor(COLOR.muted).font('Helvetica').fontSize(7).text('DOXA - Seguimiento de evidencias', 36, footerY, { width: 280 });
      doc.text(`Página ${pageIndex + 1} de ${pageRange.count}`, doc.page.width - 150, footerY, { width: 114, align: 'right' });
    }
    doc.end();
  });

  return Buffer.concat(chunks);
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
    const [snapshots, archives, deleted, replacements] = await Promise.all([
      prisma.tallySubmissionSnapshot.findMany({ where: { tallySubmissionId: { in: submissionIds } } }),
      prisma.tallyArchivoSnapshot.findMany({ where: { tallySubmissionId: { in: submissionIds }, syncStatus: { not: 'deleted' } } }),
      prisma.tallyDeletedSubmission.findMany({ where: { tallySubmissionId: { in: submissionIds } }, select: { tallySubmissionId: true } }),
      prisma.evidenciaTallyReemplazo.findMany({ where: { tallySubmissionId: { in: submissionIds }, active: true } }),
    ]);
    const snapshotMap = new Map(snapshots.map((item) => [item.tallySubmissionId, item]));
    const deletedSet = new Set(deleted.map((item) => item.tallySubmissionId));
    const archivesBySubmission = new Map<string, Map<string, typeof archives[number]>>();
    for (const archive of archives) {
      const map = archivesBySubmission.get(archive.tallySubmissionId) ?? new Map<string, typeof archive>();
      map.set(cleanUrl(archive.tallyFileUrl), archive);
      archivesBySubmission.set(archive.tallySubmissionId, map);
    }
    const replacementsBySubmission = new Map<string, Map<string, typeof replacements[number]>>();
    for (const replacement of replacements) {
      const map = replacementsBySubmission.get(replacement.tallySubmissionId) ?? new Map<string, typeof replacement>();
      map.set(`${replacement.questionId ?? ''}::${cleanUrl(replacement.tallyFileUrl)}`, replacement);
      replacementsBySubmission.set(replacement.tallySubmissionId, map);
    }

    const groupQuestions = tallyData.questions.filter((question) => question.title?.toLowerCase().includes('grupo') || question.title?.toLowerCase().includes('selecciona'));
    const classQuestions = tallyData.questions.filter((question) => question.title?.toLowerCase().includes('clase') || question.title?.toLowerCase().includes('número') || question.title?.toLowerCase().includes('numero'));
    const sourceRows: { grupo: string; clase: string; fecha: Date; reviews: ReviewItem[] }[] = [];

    for (const submission of tallyData.submissions) {
      if (deletedSet.has(submission.id)) continue;
      const answerFor = (ids: string[]) => extractAnswer(submission.responses.find((response) => ids.includes(response.questionId))?.answer);
      const snapshot = snapshotMap.get(submission.id);
      const grupo = answerFor(groupQuestions.map((question) => question.id)) || snapshot?.grupo || 'Sin grupo';
      const clase = answerFor(classQuestions.map((question) => question.id)) || snapshot?.clase || 'Sin clase';
      const fecha = snapshot?.fechaActividadReal ?? new Date(submission.submittedAt ?? submission.createdAt);
      if (grupoFilter && grupo !== grupoFilter) continue;
      if (claseFilter && clase !== claseFilter) continue;
      if (desde && fecha < desde) continue;
      if (hasta && fecha > hasta) continue;

      const archiveMap = archivesBySubmission.get(submission.id);
      const replacementMap = replacementsBySubmission.get(submission.id);
      const reviews = getSubmissionFileGroups(submission.responses, tallyData.questions).flatMap((group) =>
        group.archivos.map((file): ReviewItem => {
          const fileUrl = cleanUrl(file.url);
          const archive = archiveMap?.get(fileUrl);
          const replacement = replacementMap?.get(`${group.questionId ?? ''}::${fileUrl}`) ?? replacementMap?.get(`::${fileUrl}`);
          const pendingCorrection = correctionPending(replacement, archive);
          const status = pendingCorrection
            ? 'pendiente'
            : archive?.estadoRevision === 'cumple'
              ? 'cumple'
              : archive?.estadoRevision === 'no_cumple'
                ? 'no_cumple'
                : 'pendiente';
          return { status, observation: archive?.observacionRevision || null, correctionPending: pendingCorrection };
        })
      );
      sourceRows.push({ grupo, clase, fecha, reviews });
    }

    const pdf = await createPdf({
      componente: component.nombre,
      grupo: grupoFilter,
      clase: claseFilter,
      desde: desdeRaw,
      hasta: hastaRaw,
      revisor: session.isSuperAdmin ? 'Super Administrador' : session.usuario?.nombre || session.userId,
      rows: summarize(sourceRows),
    });

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="acta-general-evidencias.pdf"',
        'Content-Length': String(pdf.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Error generating filtered evidence report:', error);
    return NextResponse.json({ error: 'Error al generar el acta general' }, { status: 500 });
  }
}
