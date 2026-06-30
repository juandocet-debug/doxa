import crypto from 'crypto';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  customFolder?: string
): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const folder = customFolder || process.env.CLOUDINARY_FOLDER || 'doxa/evidencias';

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Configuración de Cloudinary incompleta en las variables de entorno.');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Parámetros a firmar (ordenados alfabéticamente)
  const params: Record<string, string> = {
    folder,
    timestamp,
  };

  const sortedKeys = Object.keys(params).sort();
  const signatureString = sortedKeys.map(k => `${k}=${params[k]}`).join('&') + apiSecret;
  const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

  const formData = new FormData();
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('folder', folder);
  formData.append('signature', signature);

  const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
  formData.append('file', blob, fileName);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Cloudinary upload API error response:', errText);
    throw new Error('Error interno al subir el archivo al almacenamiento.');
  }

  const data = (await res.json()) as { secure_url: string; public_id: string };
  return {
    url: data.secure_url,
    publicId: data.public_id,
  };
}

export async function deleteFromCloudinary(publicId: string, resourceType: string = 'image'): Promise<void> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('Cloudinary credentials missing, skipping deletion.');
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

  const formData = new FormData();
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('public_id', publicId);
  formData.append('signature', signature);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Cloudinary destroy API error response:', errText);
    }
  } catch (err) {
    console.error('Error contacting Cloudinary API:', err);
  }
}
