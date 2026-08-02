import { useState, useEffect, useCallback, useRef } from 'react';
import { COMPONENTES } from '@/lib/componentes';
import { SessionComp, SubmisionEvidencia, SessionPermiso, TallyFile, ReemplazoModalState, RevisionModalState } from '../types';
import { getEvidencePermissions } from '../permissions';
import { usePreviewControls } from './usePreviewControls';
import { useEvidenciasActions } from './evidenciasActions';

export function useEvidencias() {
  const [session, setSession] = useState<SessionComp | null>(null);
  const [selectedCompId, setSelectedCompIdState] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterClase, setFilterClase] = useState('');
  const [filterDesde, setFilterDesde] = useState('');
  const [filterHasta, setFilterHasta] = useState('');
  const [submissions, setSubmissions] = useState<SubmisionEvidencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const previewControls = usePreviewControls();
  const { setPreview } = previewControls;
  const loadRequestSeq = useRef(0);
  const [approving, setApproving] = useState<string | null>(null);
  const [notasModal, setNotasModal] = useState<{ id: string; formId: string } | null>(null);
  const [notasText, setNotasText] = useState('');
  const [uploadingDrive, setUploadingDrive] = useState<string | null>(null);
  const [driveResultModal, setDriveResultModal] = useState<{ success: boolean; message: string } | null>(null);
  const [syncingBackup, setSyncingBackup] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [updatingFechaReal, setUpdatingFechaReal] = useState<string | null>(null);
  const [revisionModal, setRevisionModal] = useState<RevisionModalState | null>(null);
  const [revisionObservacion, setRevisionObservacion] = useState('');
  const [revisionSaving, setRevisionSaving] = useState(false);
  const [revisionError, setRevisionError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState<Record<string, { label: string; archivos: TallyFile[] }[]>>({});
  const [loadingFiles, setLoadingFiles] = useState<Record<string, boolean>>({});
  const [clasesConEnvio, setClasesConEnvio] = useState<Set<string>>(new Set());
  const [estadoPorClase, setEstadoPorClase] = useState<Map<string, string>>(new Map());
  const [reemplazarModal, setReemplazarModal] = useState<ReemplazoModalState | null>(null);
  const [reemplazarMotivo, setReemplazarMotivo] = useState('');
  const [reemplazarFile, setReemplazarFile] = useState<File | null>(null);
  const [reemplazarError, setReemplazarError] = useState('');
  const [reemplazarSaving, setReemplazarSaving] = useState(false);
  const [reemplazarFilePreview, setReemplazarFilePreview] = useState<string | null>(null);
  const [manualUploadModal, setManualUploadModal] = useState<SubmisionEvidencia | null>(null);
  const [manualUploadLabel, setManualUploadLabel] = useState('Lista de asistencia');
  const [manualUploadMotivo, setManualUploadMotivo] = useState('');
  const [manualUploadFile, setManualUploadFile] = useState<File | null>(null);
  const [manualUploadFilePreview, setManualUploadFilePreview] = useState<string | null>(null);
  const [manualUploadError, setManualUploadError] = useState('');
  const [manualUploadSaving, setManualUploadSaving] = useState(false);

  const load = useCallback(async (targetPage = 1) => {
    if (!selectedCompId) return;
    const requestId = ++loadRequestSeq.current;
    setLoading(true);
    setError('');
    try {
      const effectivePageSize = filterClase ? pageSize : 120;
      const params = new URLSearchParams({ componente: selectedCompId, page: String(targetPage), pageSize: String(effectivePageSize) });
      if (filterGrupo) params.set('grupo', filterGrupo);
      if (filterClase) params.set('clase', filterClase);
      if (filterDesde) params.set('desde', filterDesde);
      if (filterHasta) params.set('hasta', filterHasta);
      const res = await fetch(`/api/admin/evidencias?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar');
      if (requestId !== loadRequestSeq.current) return;
      setSubmissions(data.submissions ?? []);
      setTotal(data.total ?? 0);
      setHasNext(data.hasNext ?? false);
      setPage(data.page ?? 1);
      if (data.clasesConEnvio) setClasesConEnvio(new Set(data.clasesConEnvio));
      if (data.estadoPorClase) setEstadoPorClase(new Map(Object.entries(data.estadoPorClase)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally {
      if (requestId === loadRequestSeq.current) setLoading(false);
    }
  }, [selectedCompId, filterGrupo, filterClase, filterDesde, filterHasta, pageSize]);

  const fetchFilesForSubmission = useCallback(async (submissionId: string) => {
    if (loadedFiles[submissionId]) return;
    const requestId = loadRequestSeq.current;
    setLoadingFiles(prev => ({ ...prev, [submissionId]: true }));
    try {
      const res = await fetch(`/api/admin/evidencias/${submissionId}/files`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar archivos');
      if (requestId !== loadRequestSeq.current) return;
      setLoadedFiles(prev => ({ ...prev, [submissionId]: data.fotos || [] }));
    } catch (e) {
      console.error(e);
    } finally {
      if (requestId === loadRequestSeq.current) setLoadingFiles(prev => ({ ...prev, [submissionId]: false }));
    }
  }, [loadedFiles]);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(async (d: SessionComp) => {
        setSession(d);
        const visibleComp = COMPONENTES.find(c =>
          d.isSuperAdmin || d.permisos?.some((p: SessionPermiso) => p.componenteId === c.id && p.puedeVer)
        );
        setSelectedCompIdState(visibleComp ? visibleComp.id : '');
        setAuthLoading(false);
      })
      .catch(() => { window.location.href = '/login'; });
  }, []);

  const resetEvidenceViewState = useCallback(() => {
    loadRequestSeq.current += 1;
    setFilterGrupo('');
    setFilterClase('');
    setPreview(null);
    setLoadedFiles({});
    setLoadingFiles({});
    setClasesConEnvio(new Set());
    setEstadoPorClase(new Map());
    setPage(1);
  }, [setPreview]);

  const setSelectedCompId = useCallback((id: string) => {
    resetEvidenceViewState();
    setSelectedCompIdState(id);
  }, [resetEvidenceViewState]);

  const permissions = getEvidencePermissions(session, selectedCompId);

  useEffect(() => {
    if (session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      load(1);
    }
  }, [session, selectedCompId, filterGrupo, filterClase, filterDesde, filterHasta, load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilterClase('');
    setPreview(null);
  }, [filterGrupo, setPreview]);

  useEffect(() => {
    setPreview(null);
  }, [filterClase, setPreview]);

  const actions = useEvidenciasActions({
    page,
    selectedCompId,
    submissions,
    notasModal,
    notasText,
    reemplazarModal,
    reemplazarMotivo,
    reemplazarFile,
    reemplazarFilePreview,
    manualUploadModal,
    manualUploadLabel,
    manualUploadMotivo,
    manualUploadFile,
    manualUploadFilePreview,
    revisionModal,
    revisionObservacion,
    load,
    setApproving,
    setSubmissions,
    setPreview,
    setNotasModal,
    setUploadingDrive,
    setDriveResultModal,
    setSyncingBackup,
    setDeletingFile,
    setUpdatingFechaReal,
    setRevisionModal,
    setRevisionObservacion,
    setRevisionSaving,
    setRevisionError,
    setReemplazarModal,
    setReemplazarError,
    setReemplazarSaving,
    setReemplazarFilePreview,
    setManualUploadModal,
    setManualUploadLabel,
    setManualUploadMotivo,
    setManualUploadFile,
    setManualUploadError,
    setManualUploadSaving,
    setManualUploadFilePreview,
    setLoadedFiles,
    setFilterClase,
  });

  return {
    session,
    selectedCompId,
    setSelectedCompId,
    authLoading,
    filterGrupo,
    setFilterGrupo,
    filterClase,
    setFilterClase,
    filterDesde,
    setFilterDesde,
    filterHasta,
    setFilterHasta,
    submissions,
    setSubmissions,
    loading,
    error,
    ...previewControls,
    approving,
    notasModal,
    setNotasModal,
    notasText,
    setNotasText,
    uploadingDrive,
    driveResultModal,
    setDriveResultModal,
    syncingBackup,
    deletingFile,
    updatingFechaReal,
    revisionModal,
    setRevisionModal,
    revisionObservacion,
    setRevisionObservacion,
    revisionSaving,
    revisionError,
    reemplazarModal,
    setReemplazarModal,
    reemplazarMotivo,
    setReemplazarMotivo,
    reemplazarFile,
    setReemplazarFile,
    reemplazarError,
    setReemplazarError,
    reemplazarSaving,
    reemplazarFilePreview,
    setReemplazarFilePreview,
    manualUploadModal,
    setManualUploadModal,
    manualUploadLabel,
    setManualUploadLabel,
    manualUploadMotivo,
    setManualUploadMotivo,
    manualUploadFile,
    setManualUploadFile,
    manualUploadFilePreview,
    setManualUploadFilePreview,
    manualUploadError,
    manualUploadSaving,
    ...actions,
    load,
    ...permissions,
    clasesConEnvio,
    estadoPorClase,
    page,
    setPage,
    total,
    hasNext,
    loadedFiles,
    loadingFiles,
    fetchFilesForSubmission,
  };
}

export type UseEvidenciasReturn = ReturnType<typeof useEvidencias>;
