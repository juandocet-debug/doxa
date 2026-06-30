export interface TallyFile {
  id: string;
  name: string;
  url: string;
  downloadUrl?: string;
  mimeType: string;
  size: number;
  isReplaced?: boolean;
  originalUrl?: string;
  originalName?: string;
  motivoReemplazo?: string;
  isSynced?: boolean;
  syncStatus?: string;
  syncError?: string | null;
}

export interface SubmisionEvidencia {
  submissionId: string;
  formId: string;
  componenteId: string;
  componenteNombre: string;
  grupo: string;
  clase: string;
  fechaEnvio: string;
  fotos: { label: string; archivos: TallyFile[] }[];
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  notas: string | null;
}

export interface SubmisionMetadata {
  submissionId: string;
  formId: string;
  componenteId: string;
  componenteNombre: string;
  grupo: string;
  clase: string;
  fechaEnvio: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  notas: string | null;
}
