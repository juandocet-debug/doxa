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
  correctionPending?: boolean;
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
  fotos?: { label: string; archivos: TallyFile[] }[];
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

export interface Preview {
  submissionId: string;
  url: string;
  name: string;
  label: string;
}

export interface ReemplazoModalState {
  submissionId: string;
  formId: string;
  questionId: string | null;
  tallyFileUrl: string;
  tallyFileName: string | null;
  currentName: string;
  currentUrl: string;
}

export interface RevisionModalState {
  submission: SubmisionEvidencia;
  archivo: TallyFile & { label: string };
  estadoRevision: 'cumple' | 'no_cumple';
}

export interface SessionPermiso {
  componenteId: string;
  puedeVer: boolean;
  puedeAprobar: boolean;
  puedeDevolver: boolean;
  puedeReemplazar: boolean;
  puedeEliminarEvidencia: boolean;
  puedeRevisarEvidencia: boolean;
  puedeSincronizarBackup: boolean;
  puedeExportar: boolean;
}

export interface SessionComp {
  compId: string;
  nombre: string;
  isSuperAdmin: boolean;
  isSuperCoordinador?: boolean;
  puedeEliminarClases?: boolean;
  permisos: SessionPermiso[];
  fotoUrl?: string | null;
  rolBase?: string | null;
}
