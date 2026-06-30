import { prisma } from '@/lib/db';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { logAuditoria } from '@/lib/session-helper';

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
    where: { clase },
    select: { tallySubmissionId: true }
  });
  const submissionIds = snapshots.map(s => s.tallySubmissionId);

  // Record all these submissionIds as permanently deleted
  await Promise.all(
    submissionIds.map(subId =>
      prisma.tallyDeletedSubmission.upsert({
        where: { tallySubmissionId: subId },
        update: {},
        create: { tallySubmissionId: subId }
      })
    )
  );

  // Gather files & replacements to delete from Cloudinary
  const fileSnaps = await prisma.tallyArchivoSnapshot.findMany({
    where: { tallySubmissionId: { in: submissionIds } },
    select: { cloudinaryPublicId: true }
  });
  const replacements = await prisma.evidenciaTallyReemplazo.findMany({
    where: { tallySubmissionId: { in: submissionIds } },
    select: { replacementPublicId: true }
  });

  const publicIds = [
    ...fileSnaps.map(f => f.cloudinaryPublicId),
    ...replacements.map(r => r.replacementPublicId)
  ].filter((id): id is string => !!id);

  // Async Cloudinary cleanup
  await Promise.all(publicIds.map(id => deleteFromCloudinary(id).catch(err => console.error('Cloudinary destroy err:', err))));

  await prisma.tallySubmissionSnapshot.deleteMany({
    where: { clase }
  });
  await prisma.aprobacionTally.deleteMany({
    where: { tallySubmissionId: { in: submissionIds } }
  });
  await prisma.evidenciaTallyReemplazo.deleteMany({
    where: { tallySubmissionId: { in: submissionIds } }
  });

  await logAuditoria({
    usuarioId: sessionUserId,
    accion: 'ELIMINAR_CLASE',
    componenteId: targetComponentId,
    clase,
    detalle: `Se eliminaron todas las entregas de la clase ${clase}`
  });
}
