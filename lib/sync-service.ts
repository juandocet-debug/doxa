import { prisma } from './db';
import { uploadToCloudinary } from './cloudinary';
import { COMPONENTES } from './componentes';

const API = process.env.TALLY_API_URL || 'https://api.tally.so';
const KEY = process.env.TALLY_API_KEY;

interface TallyFile {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

function extractAnswer(answer: unknown): string {
  if (!answer) return '';
  if (Array.isArray(answer)) return (answer[0] as string) ?? '';
  return String(answer);
}

function extractFiles(answer: unknown): TallyFile[] {
  if (!Array.isArray(answer)) return [];
  return answer.filter((f) => f && typeof f === 'object' && 'url' in f) as TallyFile[];
}

export async function syncSubmissionSnapshot(formId: string, submissionId: string) {
  if (!KEY) {
    throw new Error('Configuración de Tally incompleta en el servidor (Falta API Key).');
  }

  // Find component name/id
  const comp = COMPONENTES.find(c => c.formId === formId);
  const componenteId = comp?.id || null;
  const componenteNombre = comp?.nombre || null;

  // 1. Fetch submissions from Tally API
  const res = await fetch(`${API}/forms/${formId}/submissions?limit=500`, {
    headers: { Authorization: `Bearer ${KEY}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Error de Tally API: ${res.status}`);
  }
  const tallyData = await res.json();
  const submissionsList = (tallyData.submissions ?? tallyData.data?.submissions ?? []) as {
    id: string;
    submittedAt?: string;
    createdAt?: string;
    responses: { questionId: string; answer: unknown }[];
  }[];

  const sub = submissionsList.find(s => s.id === submissionId);
  if (!sub) {
    throw new Error(`El envío con ID ${submissionId} no existe en Tally.`);
  }

  const questions = (tallyData.questions ?? tallyData.data?.questions ?? []) as { id: string; title: string; type: string }[];
  const grupoQ = questions.find(q => q.title?.toLowerCase().includes('grupo') || q.title?.toLowerCase().includes('selecciona'));
  const claseQ = questions.find(q => q.title?.toLowerCase().includes('clase') || q.title?.toLowerCase().includes('número'));
  const fotoQs = questions.filter(q => q.type === 'FILE_UPLOAD');

  const getResp = (qId: string) => sub.responses.find(r => r.questionId === qId)?.answer;

  const grupo = grupoQ ? extractAnswer(getResp(grupoQ.id)) : '';
  const clase = claseQ ? extractAnswer(getResp(claseQ.id)) : '';
  const fechaEnvioStr = sub.submittedAt ?? sub.createdAt;
  const fechaEnvio = fechaEnvioStr ? new Date(fechaEnvioStr) : null;

  // Create or Update Submission Snapshot in Neon
  const snapshot = await prisma.tallySubmissionSnapshot.upsert({
    where: { tallySubmissionId: submissionId },
    create: {
      tallySubmissionId: submissionId,
      formId,
      componenteId,
      componenteNombre,
      grupo,
      clase,
      fechaEnvio,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawJson: sub as any,
    },
    update: {
      formId,
      componenteId,
      componenteNombre,
      grupo,
      clase,
      fechaEnvio,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawJson: sub as any,
    }
  });

  // Extract all files from this submission
  const filesToSync: { file: TallyFile; qId: string; qLabel: string }[] = [];
  for (const q of fotoQs) {
    const files = extractFiles(getResp(q.id));
    for (const f of files) {
      filesToSync.push({ file: f, qId: q.id, qLabel: q.title });
    }
  }

  // Process files one by one (or batch size 1 to avoid blocking, with concurrency controlled)
  const results = [];
  for (const item of filesToSync) {
    const fileUrl = item.file.url;
    // Find if already exists
    let dbFile = await prisma.tallyArchivoSnapshot.findUnique({
      where: { tallyFileUrl: fileUrl }
    });

    if (dbFile && dbFile.syncStatus === 'synced' && dbFile.cloudinaryUrl) {
      // Already synced, skip upload
      results.push(dbFile);
      continue;
    }

    if (!dbFile) {
      dbFile = await prisma.tallyArchivoSnapshot.create({
        data: {
          snapshotId: snapshot.id,
          tallySubmissionId: submissionId,
          formId,
          questionId: item.qId,
          questionLabel: item.qLabel,
          tallyFileId: item.file.id,
          tallyFileName: item.file.name,
          tallyFileUrl: fileUrl,
          tallyMime: item.file.mimeType,
          tallySize: item.file.size,
          syncStatus: 'pending'
        }
      });
    }

    // Attempt download and upload to Cloudinary
    try {
      const fileRes = await fetch(fileUrl, { signal: AbortSignal.timeout(15000) });
      if (!fileRes.ok) {
        throw new Error(`Error de descarga desde Tally: HTTP ${fileRes.status}`);
      }
      const buffer = Buffer.from(await fileRes.arrayBuffer());
      const customFolder = `doxa/evidencias/originales/${formId}/${submissionId}`;
      const uploadResult = await uploadToCloudinary(buffer, item.file.name, item.file.mimeType, customFolder);

      // Update db file as synced
      dbFile = await prisma.tallyArchivoSnapshot.update({
        where: { id: dbFile.id },
        data: {
          cloudinaryUrl: uploadResult.url,
          cloudinaryPublicId: uploadResult.publicId,
          cloudinaryMime: item.file.mimeType,
          cloudinarySize: item.file.size,
          syncStatus: 'synced',
          syncError: null,
          syncedAt: new Date()
        }
      });
    } catch (error: unknown) {
      console.error(`Error syncing file ${fileUrl} to Cloudinary:`, error);
      const errMsg = error instanceof Error ? error.message : 'Error desconocido';
      dbFile = await prisma.tallyArchivoSnapshot.update({
        where: { id: dbFile.id },
        data: {
          syncStatus: 'failed',
          syncError: errMsg
        }
      });
    }

    results.push(dbFile);
  }

  return {
    snapshot,
    files: results
  };
}

export async function syncFormSnapshots(formId: string) {
  if (!KEY) {
    throw new Error('Configuración de Tally incompleta en el servidor (Falta API Key).');
  }

  // 1. Fetch submissions list from Tally
  const res = await fetch(`${API}/forms/${formId}/submissions?limit=500`, {
    headers: { Authorization: `Bearer ${KEY}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Error de Tally API: ${res.status}`);
  }
  const tallyData = await res.json();
  const submissionsList = (tallyData.submissions ?? tallyData.data?.submissions ?? []) as { id: string }[];

  const results = [];
  // Synchronize all submissions sequentially to avoid overloading the API
  for (const s of submissionsList) {
    try {
      const syncResult = await syncSubmissionSnapshot(formId, s.id);
      results.push({ submissionId: s.id, success: true, filesSyncedCount: syncResult.files.filter(f => f.syncStatus === 'synced').length });
    } catch (e: unknown) {
      console.error(`Failed to sync submission ${s.id}:`, e);
      const errorMsg = e instanceof Error ? e.message : 'Error desconocido';
      results.push({ submissionId: s.id, success: false, error: errorMsg });
    }
  }

  return results;
}
