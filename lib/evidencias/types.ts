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
  questionId?: string | null;
  isManual?: boolean;
  estadoRevision?: 'pendiente' | 'cumple' | 'no_cumple';
  observacionRevision?: string | null;
}

export interface SubmisionEvidencia {
  submissionId: string;
  formId: string;
  componenteId: string;
  componenteNombre: string;
  grupo: string;
  clase: string;
  fechaEnvio: string;
  fechaActividadReal?: string | null;
  fotos: { label: string; archivos: TallyFile[] }[];
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  backupStatus?: 'synced' | 'partial' | 'pending' | 'failed' | 'empty';
  reviewSummary?: {
    total: number;
    cumple: number;
    noCumple: number;
    pendientes: number;
  };
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
  fechaActividadReal?: string | null;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  backupStatus?: 'synced' | 'partial' | 'pending' | 'failed' | 'empty';
  reviewSummary?: {
    total: number;
    cumple: number;
    noCumple: number;
    pendientes: number;
  };
  notas: string | null;
}
