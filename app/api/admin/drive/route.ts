import { NextResponse } from 'next/server';
import crypto from 'crypto';
import JSZip from 'jszip';
import { prisma } from '@/lib/db';
import { requireSession, AuthError } from '@/lib/session-helper';
import { SUPER_ADMIN_ID } from '@/lib/auth';

const API = process.env.TALLY_API_URL!;
const KEY = process.env.TALLY_API_KEY!;

function signRS256(payload: object, privateKey: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const stringToSign = `${encodedHeader}.${encodedPayload}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(stringToSign);
  const signature = sign.sign(privateKey, 'base64url');
  return `${stringToSign}.${signature}`;
}

async function getDriveAccessToken(serviceAccountJson: string): Promise<string> {
  const creds = JSON.parse(serviceAccountJson);
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const claim = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat
  };

  const jwt = signRS256(claim, creds.private_key);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Auth failed: ${errText}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function uploadToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  fileBuffer: Uint8Array
): Promise<string> {
  const metadata = {
    name: fileName,
    parents: folderId ? [folderId] : []
  };

  const boundary = 'doxa_boundary_string';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const mediaHeader = `${delimiter}Content-Type: application/zip\r\n\r\n`;

  const textEncoder = new TextEncoder();
  const metadataBytes = textEncoder.encode(metadataPart);
  const mediaHeaderBytes = textEncoder.encode(mediaHeader);
  const closeDelimiterBytes = textEncoder.encode(closeDelimiter);

  const totalLength = metadataBytes.length + mediaHeaderBytes.length + fileBuffer.length + closeDelimiterBytes.length;
  const body = new Uint8Array(totalLength);

  let offset = 0;
  body.set(metadataBytes, offset); offset += metadataBytes.length;
  body.set(mediaHeaderBytes, offset); offset += mediaHeaderBytes.length;
  body.set(fileBuffer, offset); offset += fileBuffer.length;
  body.set(closeDelimiterBytes, offset);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(totalLength)
    },
    body
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive upload failed: ${errText}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}

function ext(name: string, mime: string) {
  if (mime?.includes('pdf')) return '.pdf';
  if (mime?.includes('png')) return '.png';
  if (mime?.includes('jpeg')) return '.jpg';
  if (mime?.includes('webp')) return '.webp';
  const lastDot = name.lastIndexOf('.');
  return lastDot !== -1 ? name.slice(lastDot) : '';
}

function slug(t: string) {
  return t.normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export async function POST(req: Request) {
  try {
    const currentUserId = await requireSession();
    const isSuperAdmin = currentUserId === SUPER_ADMIN_ID;
    const hasGlobalRead = isSuperAdmin || currentUserId === 'verificador';

    const { formId, submissionId, zipName } = await req.json() as {
      formId: string;
      submissionId: string;
      zipName: string;
    };

    if (!formId || !submissionId || !zipName) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    // Access control: Ensure coordinator owns this form
    if (!hasGlobalRead) {
      const tallyForm = await prisma.tallyFormulario.findUnique({
        where: { tallyFormId: formId }
      });
      if (!tallyForm || tallyForm.componenteId !== currentUserId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Si las credenciales no están configuradas, retornar error específico para advertir al usuario
    if (!serviceAccountJson || !folderId) {
      return NextResponse.json({
        error: 'CONFIG_MISSING',
        message: 'Google Drive no configurado. Agrega GOOGLE_SERVICE_ACCOUNT_JSON y GOOGLE_DRIVE_FOLDER_ID a tus variables de entorno.'
      }, { status: 400 });
    }

    // 1. Obtener submissions de Tally
    const res = await fetch(`${API}/forms/${formId}/submissions?limit=500`, {
      headers: { Authorization: `Bearer ${KEY}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Tally API ${res.status}`);
    const data = await res.json();

    const questions = (data.questions ?? []) as { id: string; title: string; type: string }[];
    const sub = ((data.submissions ?? []) as {
      id: string;
      responses: { questionId: string; answer: unknown }[];
    }[]).find(s => s.id === submissionId);

    if (!sub) return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 });

        const fotoQs = questions.filter(q => q.type === 'FILE_UPLOAD');

    const cleanUrl = (u: string) => {
      try {
        const parsed = new URL(u);
        return parsed.origin + parsed.pathname;
      } catch {
        return u;
      }
    };

    const replacements = await prisma.evidenciaTallyReemplazo.findMany({
      where: {
        tallySubmissionId: submissionId,
        active: true,
      },
    });
    const replacementMap = new Map<string, typeof replacements[0]>();
    for (const r of replacements) {
      replacementMap.set(cleanUrl(r.tallyFileUrl), r);
    }

    const archives = await prisma.tallyArchivoSnapshot.findMany({
      where: {
        tallySubmissionId: submissionId,
        syncStatus: 'synced'
      }
    });
    const archiveMap = new Map<string, typeof archives[0]>();
    for (const a of archives) {
      archiveMap.set(cleanUrl(a.tallyFileUrl), a);
    }

    const downloadQueue: { qTitle: string; file: { url: string; name: string; mimeType: string } }[] = [];
    for (const q of fotoQs) {
      const resp = sub.responses.find(r => r.questionId === q.id);
      const files = Array.isArray(resp?.answer) ? resp.answer as { url: string; name: string; mimeType: string }[] : [];
      for (const file of files) {
        const fileClean = cleanUrl(file.url);
        const repl = replacementMap.get(fileClean);
        const arch = archiveMap.get(fileClean);

        const resolvedFile = repl ? {
          url: repl.replacementUrl,
          name: repl.replacementName || file.name,
          mimeType: repl.replacementMime || file.mimeType
        } : (arch && arch.cloudinaryUrl ? {
          url: arch.cloudinaryUrl,
          name: arch.tallyFileName || file.name,
          mimeType: arch.cloudinaryMime || file.mimeType
        } : file);

        downloadQueue.push({ qTitle: q.title, file: resolvedFile });
      }
    }

    const downloadedFiles = await Promise.allSettled(
      downloadQueue.map(async (item, i) => {
        const fileRes = await fetch(item.file.url, { signal: AbortSignal.timeout(8000) });
        if (!fileRes.ok) throw new Error(`Download status ${fileRes.status}`);
        const buf = await fileRes.arrayBuffer();
        return { item, buf, index: i + 1 };
      })
    );

    const zip = new JSZip();
    for (const result of downloadedFiles) {
      if (result.status === 'fulfilled') {
        const { item, buf, index } = result.value;
        const label = slug(item.qTitle.replace(/fotografía\s*\d+\s*/i, '').replace(/[()]/g, '').trim() || item.qTitle);
        const fname = `${String(index).padStart(2, '0')}_${label}${ext(item.file.name, item.file.mimeType) || '.' + item.file.name.split('.').pop()}`;
        zip.file(fname, buf);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });

    // 2. Autenticar y subir a Google Drive
    const token = await getDriveAccessToken(serviceAccountJson);
    const driveFileId = await uploadToDrive(token, folderId, `${zipName}.zip`, zipBuffer);

    return NextResponse.json({
      success: true,
      fileId: driveFileId,
      message: `Enviado a Google Drive exitosamente.`
    });

  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
