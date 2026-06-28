export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { requireSession, AuthError } from '@/lib/session-helper';

interface TallyQuestion {
  id: string;
  label: string;
}

interface TallyFileResponse {
  url: string;
  name: string;
  mimeType: string;
}

interface ImageAnswer {
  label: string;
  files: TallyFileResponse[];
}

export async function POST(req: Request) {
  try {
    await requireSession();

    const { formTitle, submission, questions } = await req.json() as {
      formTitle: string;
      submission: {
        id: string;
        submittedAt: string;
        responses: Array<{ questionId: string; answer: unknown }>;
      };
      questions: TallyQuestion[];
    };

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    await new Promise<void>((resolve) => {
      doc.on('end', resolve);

      const pageW = doc.page.width - 100;

      // Título
      doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a1a2e')
        .text(formTitle || 'Formulario', { align: 'center' });
      doc.moveDown(0.5);

      // Separador
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y)
        .strokeColor('#3b82f6').lineWidth(2).stroke();
      doc.moveDown(1);

      // Fecha de envío
      doc.fontSize(10).font('Helvetica').fillColor('#6b7280')
        .text(`Enviado: ${new Date(submission.submittedAt).toLocaleString('es-CO')}`);
      doc.moveDown(1);

      // Campos de texto
      const imageAnswers: ImageAnswer[] = [];

      for (const resp of submission.responses) {
        const question = questions.find((q) => q.id === resp.questionId);
        if (!question) continue;

        const answer = resp.answer;

        // Detectar si es imagen
        if (Array.isArray(answer) && answer[0]?.url && answer[0]?.mimeType?.startsWith('image')) {
          imageAnswers.push({ label: question.label, files: answer as TallyFileResponse[] });
          continue;
        }

        const displayValue = Array.isArray(answer)
          ? answer.join(', ')
          : answer?.toString() || '-';

        doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
          .text(question.label.toUpperCase());
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1a2e')
          .text(displayValue);
        doc.moveDown(0.8);
      }

      // Imágenes al 50% del ancho
      if (imageAnswers.length > 0) {
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y)
          .strokeColor('#3b82f6').lineWidth(1).stroke();
        doc.moveDown(1);
      }

      const pendingImages = imageAnswers.flatMap((ia) =>
        ia.files.map((f) => ({ label: ia.label, ...f }))
      );

      if (pendingImages.length === 0) {
        doc.end();
        return;
      }

      // Descargar imágenes y agregar al PDF
      Promise.all(
        pendingImages.map(async (img) => {
          const r = await fetch(img.url);
          if (!r.ok) return null;
          const buf = Buffer.from(await r.arrayBuffer());
          return { ...img, buffer: buf };
        })
      ).then((imgs) => {
        for (const img of imgs) {
          if (!img?.buffer) continue;
          const imgW = pageW * 0.5;
          const imgX = 50 + (pageW - imgW) / 2;

          doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
            .text(img.label.toUpperCase());
          doc.moveDown(0.3);

          doc.image(img.buffer, imgX, doc.y, { width: imgW });
          doc.moveDown(1);
        }
        doc.end();
      }).catch(() => doc.end());
    });

    const pdfBuffer = Buffer.concat(chunks);
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="respuesta-${submission.id}.pdf"`,
      },
    });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error desconocido' }, { status: 500 });
  }
}

