export interface ArchivoEvidencia {
  id: string;
  evidenciaCargadaId: string;
  nombreOriginal: string;
  nombreAlmacenado: string;
  urlArchivo: string;
  tipoMime: string;
  extension: string;
  peso: number;
  uploadedBy: string;
  createdAt: Date;
}

export interface EvidenciaCargada {
  id: string;
  registroId: string;
  evidenciaRequeridaId: string;
  estado: string;
  observacionRevision?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Registro {
  id: string;
  metaId: string;
  componenteId: string;
  accionId: string;
  instanciaAccionId?: string | null;
  fechaActividad: Date;
  responsable: string;
  municipio: string;
  localidad?: string | null;
  lugar?: string | null;
  observaciones?: string | null;
  estado: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
