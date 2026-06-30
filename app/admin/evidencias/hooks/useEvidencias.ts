import { useState, useEffect, useCallback, useRef } from 'react';
import { COMPONENTES } from '@/lib/componentes';
import { SessionComp, SubmisionEvidencia, Preview, SessionPermiso, TallyFile } from '../types';

export function useEvidencias() {
  const [session, setSession]         = useState<SessionComp | null>(null);
  const [selectedCompId, setSelectedCompId] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterClase, setFilterClase] = useState('');
  const [filterDesde, setFilterDesde] = useState('');
  const [filterHasta, setFilterHasta] = useState('');

  const [submissions, setSubmissions] = useState<SubmisionEvidencia[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [preview, setPreview]         = useState<Preview | null>(null);
  const [zoom, setZoom]               = useState(1);
  const [pan, setPan]                 = useState({ x: 0, y: 0 });
  const [dragging, setDragging]       = useState(false);
  const dragOrigin                    = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const [approving, setApproving]     = useState<string | null>(null);
  const [notasModal, setNotasModal]   = useState<{ id: string; formId: string } | null>(null);
  const [notasText, setNotasText]     = useState('');
  const [uploadingDrive, setUploadingDrive] = useState<string | null>(null);
  const [driveResultModal, setDriveResultModal] = useState<{ success: boolean; message: string } | null>(null);
  const [syncingBackup, setSyncingBackup] = useState<string | null>(null);

  // Pagination states
  const [page, setPage]               = useState(1);
  const [pageSize]                    = useState(20);
  const [total, setTotal]             = useState(0);
  const [hasNext, setHasNext]         = useState(false);

  // Lazy files state
  const [loadedFiles, setLoadedFiles] = useState<Record<string, { label: string; archivos: TallyFile[] }[]>>({});
  const [loadingFiles, setLoadingFiles] = useState<Record<string, boolean>>({});

  const [clasesConEnvio, setClasesConEnvio] = useState<Set<string>>(new Set());
  const [estadoPorClase, setEstadoPorClase] = useState<Map<string, string>>(new Map());

  // States for evidence replacement
  const [reemplazarModal, setReemplazarModal] = useState<{
    submissionId: string;
    formId: string;
    questionId: string | null;
    tallyFileUrl: string;
    tallyFileName: string | null;
    currentName: string;
    currentUrl: string;
  } | null>(null);
  const [reemplazarMotivo, setReemplazarMotivo] = useState('');
  const [reemplazarFile, setReemplazarFile] = useState<File | null>(null);
  const [reemplazarError, setReemplazarError] = useState('');
  const [reemplazarSaving, setReemplazarSaving] = useState(false);
  const [reemplazarFilePreview, setReemplazarFilePreview] = useState<string | null>(null);

  const load = useCallback(async (targetPage = 1) => {
    if (!selectedCompId) return;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({
        componente: selectedCompId,
        page: String(targetPage),
        pageSize: String(pageSize),
      });
      if (filterGrupo) params.set('grupo', filterGrupo);
      if (filterClase) params.set('clase', filterClase);
      if (filterDesde) params.set('desde', filterDesde);
      if (filterHasta) params.set('hasta', filterHasta);
      
      const res  = await fetch(`/api/admin/evidencias?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar');
      
      setSubmissions(data.submissions ?? []);
      setTotal(data.total ?? 0);
      setHasNext(data.hasNext ?? false);
      setPage(data.page ?? 1);
      
      if (data.clasesConEnvio) {
        setClasesConEnvio(new Set(data.clasesConEnvio));
      }
      if (data.estadoPorClase) {
        setEstadoPorClase(new Map(Object.entries(data.estadoPorClase)));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setLoading(false); }
  }, [selectedCompId, filterGrupo, filterClase, filterDesde, filterHasta, pageSize]);

  const fetchFilesForSubmission = useCallback(async (submissionId: string) => {
    if (loadedFiles[submissionId]) return;
    setLoadingFiles(prev => ({ ...prev, [submissionId]: true }));
    try {
      const res = await fetch(`/api/admin/evidencias/${submissionId}/files`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar archivos');
      setLoadedFiles(prev => ({ ...prev, [submissionId]: data.fotos || [] }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFiles(prev => ({ ...prev, [submissionId]: false }));
    }
  }, [loadedFiles]);

  async function handleReemplazarSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reemplazarModal || !reemplazarFile || !reemplazarMotivo.trim()) {
      setReemplazarError('Por favor complete todos los campos requeridos');
      return;
    }
    setReemplazarSaving(true);
    setReemplazarError('');

    try {
      const fd = new FormData();
      fd.append('tallySubmissionId', reemplazarModal.submissionId);
      fd.append('formId', reemplazarModal.formId);
      if (reemplazarModal.questionId) {
        fd.append('questionId', reemplazarModal.questionId);
      }
      fd.append('tallyFileUrl', reemplazarModal.tallyFileUrl);
      if (reemplazarModal.tallyFileName) {
        fd.append('tallyFileName', reemplazarModal.tallyFileName);
      }
      fd.append('motivo', reemplazarMotivo.trim());
      fd.append('file', reemplazarFile);

      const res = await fetch('/api/admin/evidencias/reemplazar', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al subir el reemplazo');
      }

      if (reemplazarFilePreview) {
        URL.revokeObjectURL(reemplazarFilePreview);
      }
      setReemplazarFilePreview(null);
      setReemplazarModal(null);
      // Invalidate local files cache for this submission to force re-fetch
      setLoadedFiles(prev => {
        const next = { ...prev };
        delete next[reemplazarModal.submissionId];
        return next;
      });
      load(page);
    } catch (err: unknown) {
      setReemplazarError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setReemplazarSaving(false);
    }
  }

  async function handleSyncBackup(sub: { formId: string; submissionId: string }) {
    setSyncingBackup(sub.submissionId);
    try {
      const res = await fetch('/api/admin/evidencias/sync-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: sub.formId, submissionId: sub.submissionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al respaldar evidencias');
      
      // Invalidate local files cache to show correct backed up checkmarks
      setLoadedFiles(prev => {
        const next = { ...prev };
        delete next[sub.submissionId];
        return next;
      });
      load(page);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Error al respaldar evidencias';
      alert(errorMsg);
    } finally {
      setSyncingBackup(null);
    }
  }

  async function handleDeleteSubmission(submissionId: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta entrega de evidencias? Esta acción eliminará los metadatos y respaldos.')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/evidencias?submissionId=${submissionId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar la entrega');
      setPreview(null);
      load(page);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Error al eliminar';
      alert(errorMsg);
    }
  }

  async function handleDeleteClass(clase: string) {
    if (!confirm(`¿Estás seguro de que deseas eliminar la clase "${clase}"? Se eliminarán TODAS las entregas y evidencias de esta clase.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/evidencias?clase=${encodeURIComponent(clase)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar la clase');
      setFilterClase('');
      load(1);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Error al eliminar la clase';
      alert(errorMsg);
    }
  }

  // Verificar sesión y cargar datos en una sola pasada
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(async (d: SessionComp) => {
        setSession(d);
        const visibleComp = COMPONENTES.find(c =>
          d.isSuperAdmin || d.permisos?.some((p: SessionPermiso) => p.componenteId === c.id && p.puedeVer)
        );
        const initialCompId = visibleComp ? visibleComp.id : '';
        setSelectedCompId(initialCompId);

        if (initialCompId) {
          try {
            const params = new URLSearchParams({ componente: initialCompId, page: '1', pageSize: String(pageSize) });
            const res  = await fetch(`/api/admin/evidencias?${params}`, { cache: 'no-store' });
            const data = await res.json();
            if (res.ok) {
              setSubmissions(data.submissions ?? []);
              setTotal(data.total ?? 0);
              setHasNext(data.hasNext ?? false);
              if (data.clasesConEnvio) setClasesConEnvio(new Set(data.clasesConEnvio));
              if (data.estadoPorClase) setEstadoPorClase(new Map(Object.entries(data.estadoPorClase)));
            }
          } catch { /* se reintenta con ↻ */ }
        }
        setAuthLoading(false);
      })
      .catch(() => { window.location.href = '/login'; });
  }, [pageSize]);

  const isSuperAdmin = session?.isSuperAdmin === true;
  const userPerm = session?.permisos?.find(p => p.componenteId === selectedCompId);

  const puedeVer = isSuperAdmin || !!userPerm?.puedeVer;
  const puedeAprobar = isSuperAdmin || !!userPerm?.puedeAprobar;
  const puedeDevolver = isSuperAdmin || !!userPerm?.puedeDevolver;
  const puedeReemplazar = isSuperAdmin || !!userPerm?.puedeReemplazar;
  const puedeSincronizarBackup = isSuperAdmin || !!userPerm?.puedeSincronizarBackup;
  const puedeExportar = isSuperAdmin || !!userPerm?.puedeExportar;

  const isReadOnly = !puedeAprobar && !puedeDevolver && !puedeReemplazar && !puedeSincronizarBackup;
  const currentComp = COMPONENTES.find(c => c.id === selectedCompId) ?? null;

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
  }, [filterGrupo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(null);
  }, [filterClase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [preview?.url]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom(z => Math.min(8, Math.max(0.5, z - e.deltaY * 0.001)));
  }

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setDragging(true);
    dragOrigin.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const dx = (e.clientX - dragOrigin.current.mx) / zoom;
    const dy = (e.clientY - dragOrigin.current.my) / zoom;
    setPan({ x: dragOrigin.current.px + dx, y: dragOrigin.current.py + dy });
  }

  function onMouseUp() { setDragging(false); }

  async function handleSaveNotas() {
    if (!notasModal) return;
    setApproving(notasModal.id);
    const subEstado = submissions.find(s => s.submissionId === notasModal.id)?.estado ?? 'pendiente';
    try {
      const res = await fetch(`/api/admin/evidencias/${notasModal.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: subEstado, formId: notasModal.formId, notas: notasText }),
      });
      if (!res.ok) throw new Error();
      setSubmissions(prev => prev.map(s => s.submissionId === notasModal.id ? { ...s, notas: notasText } : s));
      setNotasModal(null);
    } catch { alert('No se pudo guardar la nota'); }
    finally { setApproving(null); }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  async function handleUploadToDrive(sub: SubmisionEvidencia) {
    setUploadingDrive(sub.submissionId);
    try {
      const zipName = [sub.componenteNombre, sub.grupo, sub.clase].map(s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').slice(0,25)).join('__');
      const res = await fetch('/api/admin/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: sub.formId, submissionId: sub.submissionId, zipName }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'CONFIG_MISSING') {
          setDriveResultModal({ success: false, message: data.message });
        } else {
          setDriveResultModal({ success: false, message: data.error || 'Error al subir a Google Drive' });
        }
        return;
      }
      setDriveResultModal({ success: true, message: data.message || 'Se subió exitosamente a Google Drive.' });
    } catch {
      setDriveResultModal({ success: false, message: 'Error de red al intentar conectar con Google Drive.' });
    } finally {
      setUploadingDrive(null);
    }
  }

  async function handleAprobar(sub: SubmisionEvidencia) {
    setApproving(sub.submissionId);
    try {
      const res = await fetch(`/api/admin/evidencias/${sub.submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'aprobada', formId: sub.formId, notas: sub.notas }),
      });
      if (!res.ok) throw new Error();
      setSubmissions(prev => prev.map(s => s.submissionId === sub.submissionId ? { ...s, estado: 'aprobada' } : s));
    } catch {
      alert('Error al aprobar');
    } finally {
      setApproving(null);
    }
  }

  async function handleRechazar(sub: SubmisionEvidencia) {
    setApproving(sub.submissionId);
    try {
      const res = await fetch(`/api/admin/evidencias/${sub.submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'rechazada', formId: sub.formId, notas: sub.notas }),
      });
      if (!res.ok) throw new Error();
      setSubmissions(prev => prev.map(s => s.submissionId === sub.submissionId ? { ...s, estado: 'rechazada' } : s));
    } catch {
      alert('Error al rechazar');
    } finally {
      setApproving(null);
    }
  }

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
    preview,
    setPreview,
    zoom,
    setZoom,
    pan,
    setPan,
    dragging,
    approving,
    notasModal,
    setNotasModal,
    notasText,
    setNotasText,
    uploadingDrive,
    driveResultModal,
    setDriveResultModal,
    syncingBackup,
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
    handleReemplazarSubmit,
    handleSyncBackup,
    handleDeleteSubmission,
    handleDeleteClass,
    load,
    isSuperAdmin,
    puedeVer,
    puedeAprobar,
    puedeDevolver,
    puedeReemplazar,
    puedeSincronizarBackup,
    puedeExportar,
    isReadOnly,
    currentComp,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    clasesConEnvio,
    estadoPorClase,
    handleSaveNotas,
    handleLogout,
    handleUploadToDrive,
    handleAprobar,
    handleRechazar,
    // Paginated and lazy loader additions
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
