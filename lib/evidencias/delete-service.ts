import { prisma } from '@/lib/db';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { logAuditoria } from '@/lib/session-helper';
import { COMPONENTES } from '@/lib/componentes';
import { fetchSubmissions, extractAnswer } from './tally-fetch';
import { classCodeIdentity } from './class-code';

export async function deleteSubmission(submissionId: string, sessionUserId: string | null, targetComponentId: string | null) {
  // Record as permanently deleted
  await prisma.tallyDeletedSubmission.upsert({
    where: { tallySubmissionId: submissionId },
    update: {},
    create: { tallySubmissionId: submissionId }
  });

  // Gather files & replacements to delete from Cloudinary
  const fileSnaps = await prisma.tallyArchivoSnapshot.findMany({
    where: { tallySubmissionId: submissionId },
    select: { cloudinaryPublicId: true }
  });
  const replacements = await prisma.evidenciaTallyReemplazo.findMany({
    where: { tallySubmissionId: submissionId },
    select: { replacementPublicId: true }
  });

  const publicIds = [
    ...fileSnaps.map(f => f.cloudinaryPublicId),
    ...replacements.map(r => r.replacementPublicId)
  ].filter((id): id is string => !!id);

  // Async Cloudinary cleanup
  await Promise.all(publicIds.map(id => deleteFromCloudinary(id).catch(err => console.error('Cloudinary destroy err:', err))));

  await prisma.tallySubmissionSnapshot.deleteMany({
    where: { tallySubmissionId: submissionId }
  });
  await prisma.aprobacionTally.deleteMany({
    where: { tallySubmissionId: submissionId }
  });
  await prisma.evidenciaTallyReemplazo.deleteMany({
    where: { tallySubmissionId: submissionId }
  });

  await logAuditoria({
    usuarioId: sessionUserId,
    accion: 'ELIMINAR_ENTREGA',
    componenteId: targetComponentId,
    tallySubmissionId: submissionId,
    detalle: `Se eliminó la entrega ${submissionId} y sus archivos`
  });
}

export async function deleteClase(clase: string, sessionUserId: string | null, targetComponentId: string | null) {
  const snapshots = await prisma.tallySubmissionSnapshot.findMany({
    where: { 
      clase,
      ...(targetComponentId ? { componenteId: targetComponentId } : {})
    },
    select: { tallySubmissionId: true }
  });
  const submissionIds = snapshots.map(s => s.tallySubmissionId);

  // Fallback: Fetch directly from Tally to find matching submission IDs that are not yet in snapshots
  const fetchedSubmissionIds: string[] = [];
  if (targetComponentId) {
    const comp = COMPONENTES.find(c => c.id === targetComponentId);
    if (comp) {
      try {
        const res = await fetchSubmissions(comp.formId);
        const claseQ = res.questions.find(
          (q) => q.title?.toLowerCase().includes('clase') || q.title?.toLowerCase().includes('número')
        );
        if (claseQ) {
          for (const sub of res.submissions) {
            const ans = sub.responses.find(r => r.questionId === claseQ.id)?.answer;
            const subClase = extractAnswer(ans);
            if (subClase === clase) {
              fetchedSubmissionIds.push(sub.id);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching submissions inside deleteClase:', e);
      }
    }
  }

  // Combine both sources
  const unionIds = Array.from(new Set([...submissionIds, ...fetchedSubmissionIds]));

  // Record all these submissionIds as permanently deleted
  await Promise.all(
    unionIds.map(subId =>
      prisma.tallyDeletedSubmission.upsert({
        where: { tallySubmissionId: subId },
        update: {},
        create: { tallySubmissionId: subId }
      })
    )
  );

  // Gather files & replacements to delete from Cloudinary
  const fileSnaps = await prisma.tallyArchivoSnapshot.findMany({
    where: { tallySubmissionId: { in: unionIds } },
    select: { cloudinaryPublicId: true }
  });
  const replacements = await prisma.evidenciaTallyReemplazo.findMany({
    where: { tallySubmissionId: { in: unionIds } },
    select: { replacementPublicId: true }
  });

  const publicIds = [
    ...fileSnaps.map(f => f.cloudinaryPublicId),
    ...replacements.map(r => r.replacementPublicId)
  ].filter((id): id is string => !!id);

  // Async Cloudinary cleanup
  await Promise.all(publicIds.map(id => deleteFromCloudinary(id).catch(err => console.error('Cloudinary destroy err:', err))));

  await prisma.tallySubmissionSnapshot.deleteMany({
    where: { 
      clase,
      ...(targetComponentId ? { componenteId: targetComponentId } : {})
    }
  });
  await prisma.aprobacionTally.deleteMany({
    where: { tallySubmissionId: { in: unionIds } }
  });
  await prisma.evidenciaTallyReemplazo.deleteMany({
    where: { tallySubmissionId: { in: unionIds } }
  });
  const claseIdentity = classCodeIdentity({
    formId: '',
    componenteId: targetComponentId || '',
    grupo: '',
    clase,
  });
  await prisma.tallyClassCode.deleteMany({
    where: {
      claseKey: claseIdentity.claseKey,
      ...(targetComponentId ? { componenteId: targetComponentId } : {})
    }
  });

  await logAuditoria({
    usuarioId: sessionUserId,
    accion: 'ELIMINAR_CLASE',
    componenteId: targetComponentId,
    clase,
    detalle: `Se eliminaron todas las entregas de la clase ${clase}`
  });
}
