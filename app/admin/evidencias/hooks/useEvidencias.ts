import { useState, useEffect, useCallback, useRef } from 'react';
import { COMPONENTES } from '@/lib/componentes';
import { SessionComp, SubmisionEvidencia, Preview, SessionPermiso, TallyFile, ReemplazoModalState, RevisionModalState } from '../types';

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
  const loadRequestSeq                = useRef(0);
  const [approving, setApproving]     = useState<string | null>(null);
  const [notasModal, setNotasModal]   = useState<{ id: string; formId: string } | null>(null);
  const [notasText, setNotasText]     = useState('');
  const [uploadingDrive, setUploadingDrive] = useState<string | null>(null);
  const [driveResultModal, setDriveResultModal] = useState<{ success: boolean; message: string } | null>(null);
  const [syncingBackup, setSyncingBackup] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [updatingFechaReal, setUpdatingFechaReal] = useState<string | null>(null);
  const [revisionModal, setRevisionModal] = useState<RevisionModalState | null>(null);
  const [revisionObservacion, setRevisionObservacion] = useState('');
  const [revisionSaving, setRevisionSaving] = useState(false);
  const [revisionError, setRevisionError] = useState('');

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
    setLoading(true); setError('');
    try {
      const effectivePageSize = filterClase ? pageSize : 120;
      const params = new URLSearchParams({
        componente: selectedCompId,
        page: String(targetPage),
        pageSize: String(effectivePageSize),
      });
      if (filterGrupo) params.set('grupo', filterGrupo);
      if (filterClase) params.set('clase', filterClase);
      if (filterDesde) params.set('desde', filterDesde);
      if (filterHasta) params.set('hasta', filterHasta);
      
      const res  = await fetch(`/api/admin/evidencias?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar');
      if (requestId !== loadRequestSeq.current) return;
      
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
      setError(e instanceof Error ? e.message : 'Error de conexiÃ³n');
    } finally { if (requestId === loadRequestSeq.current) setLoading(false); }
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
      if (requestId === loadRequestSeq.current) {
        setLoadingFiles(prev => ({ ...prev, [submissionId]: false }));
      }
    }
  }, [loadedFiles]);

  async function handleUpdateFechaReal(sub: SubmisionEvidencia, fechaActividadReal: string | null) {
    setUpdatingFechaReal(sub.submissionId);
    try {
      const res = await fetch(`/api/admin/evidencias/${sub.submissionId}/fecha-real`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fechaActividadReal, formId: sub.formId, componenteId: sub.componenteId, componenteNombre: sub.componenteNombre, grupo: sub.grupo, clase: sub.clase, fechaEnvio: sub.fechaEnvio }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar la fecha real');
      setSubmissions(prev => prev.map(item => (item.formId === sub.formId && item.grupo === sub.grupo && item.clase === sub.clase) ? { ...item, fechaActividadReal: data.fechaActividadReal ?? null } : item));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar la fecha real');
    } finally {
      setUpdatingFechaReal(null);
    }
  }

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
      setReemplazarError(err instanceof Error ? err.message : 'Error de conexiÃ³n');
    } finally {
      setReemplazarSaving(false);
    }
  }

  async function handleManualUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualUploadModal || !manualUploadFile || !manualUploadLabel.trim()) {
      setManualUploadError('Seleccione un archivo y escriba el tipo de evidencia');
      return;
    }

    setManualUploadSaving(true);
    setManualUploadError('');
    try {
      const fd = new FormData();
      fd.append('tallySubmissionId', manualUploadModal.submissionId);
      fd.append('formId', manualUploadModal.formId);
      fd.append('grupo', manualUploadModal.grupo || '');
      fd.append('clase', manualUploadModal.clase || '');
      fd.append('label', manualUploadLabel.trim());
      fd.append('motivo', manualUploadMotivo.trim());
      fd.append('file', manualUploadFile);

      const res = await fetch('/api/admin/evidencias/manual-upload', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar la evidencia manual');

      if (manualUploadFilePreview) URL.revokeObjectURL(manualUploadFilePreview);
      setManualUploadFilePreview(null);
      setManualUploadFile(null);
      setManualUploadModal(null);
      setManualUploadMotivo('');
      setManualUploadLabel('Lista de asistencia');
      const freshFilesRes = await fetch(`/api/admin/evidencias/${manualUploadModal.submissionId}/files`, { cache: 'no-store' });
      const freshFilesData = await freshFilesRes.json();
      if (freshFilesRes.ok) {
        setLoadedFiles(prev => ({ ...prev, [manualUploadModal.submissionId]: freshFilesData.fotos || [] }));
      } else {
        setLoadedFiles(prev => {
          const next = { ...prev };
          delete next[manualUploadModal.submissionId];
          return next;
        });
      }
      load(page);
    } catch (err: unknown) {
      setManualUploadError(err instanceof Error ? err.message : 'Error de conexion');
    } finally {
      setManualUploadSaving(false);
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

  async function handleDeleteEvidenceFile(sub: SubmisionEvidencia, archivo: TallyFile & { label: string }) {
    const targetUrl = archivo.originalUrl || archivo.url;
    if (!confirm(`¿Eliminar esta evidencia? Se quitará de la vista, la base de datos y los respaldos asociados.`)) {
      return;
    }
    setDeletingFile(targetUrl);
    try {
      const res = await fetch('/api/admin/evidencias/file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: sub.formId,
          tallySubmissionId: sub.submissionId,
          questionId: archivo.questionId ?? null,
          questionLabel: archivo.label,
          tallyFileUrl: targetUrl,
          tallyFileName: archivo.originalName || archivo.name,
          mimeType: archivo.mimeType,
          size: archivo.size,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar la evidencia');

      setPreview(prev => (prev?.url === (archivo.downloadUrl || archivo.url) ? null : prev));
      setLoadedFiles(prev => {
        const groups = prev[sub.submissionId] || [];
        return {
          ...prev,
          [sub.submissionId]: groups
            .map(group => ({
              ...group,
              archivos: group.archivos.filter(file => (file.originalUrl || file.url) !== targetUrl),
            }))
            .filter(group => group.archivos.length > 0),
        };
      });
      load(page);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar la evidencia');
    } finally {
      setDeletingFile(null);
    }
  }

  async function handleReviewEvidenceFile(
    sub: SubmisionEvidencia,
    archivo: TallyFile & { label: string },
    estadoRevision: 'cumple' | 'no_cumple'
  ) {
    setRevisionObservacion(estadoRevision === 'no_cumple' ? (archivo.observacionRevision || '') : '');
    setRevisionError('');
    setRevisionModal({ submission: sub, archivo, estadoRevision });
  }

  async function handleRevisionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!revisionModal) return;
    const { submission: sub, archivo, estadoRevision } = revisionModal;
    const observacionRevision = revisionObservacion.trim() || null;
    if (estadoRevision === 'no_cumple' && !observacionRevision) {
      setRevisionError('Escribe la observación que debe corregirse antes de continuar.');
      return;
    }
    const targetUrl = archivo.originalUrl || archivo.url;
    setRevisionSaving(true);
    setRevisionError('');

    try {
      const res = await fetch('/api/admin/evidencias/file', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: sub.formId,
          tallySubmissionId: sub.submissionId,
          questionId: archivo.questionId ?? null,
          questionLabel: archivo.label,
          tallyFileUrl: targetUrl,
          tallyFileName: archivo.originalName || archivo.name,
          estadoRevision,
          observacionRevision,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo revisar la evidencia');

      setLoadedFiles(prev => {
        const groups = prev[sub.submissionId] || [];
        return {
          ...prev,
          [sub.submissionId]: groups.map(group => ({
            ...group,
            archivos: group.archivos.map(file => {
              if ((file.originalUrl || file.url) !== targetUrl) return file;
              return { ...file, estadoRevision, observacionRevision };
            }),
          })),
        };
      });
      setRevisionModal(null);
      setRevisionObservacion('');
    } catch (err: unknown) {
      setRevisionError(err instanceof Error ? err.message : 'Error al revisar la evidencia');
    } finally {
      setRevisionSaving(false);
    }
  }

  async function handleDeleteSubmission(submissionId: string) {
    if (!confirm('Â¿EstÃ¡s seguro de que deseas eliminar esta entrega de evidencias? Esta acciÃ³n eliminarÃ¡ los metadatos y respaldos.')) {
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
    if (!confirm(`Â¿EstÃ¡s seguro de que deseas eliminar la clase "${clase}"? Se eliminarÃ¡n TODAS las entregas y evidencias de esta clase.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/evidencias?clase=${encodeURIComponent(clase)}&componente=${encodeURIComponent(selectedCompId)}`, {
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

  // Verificar sesiÃ³n y cargar datos en una sola pasada
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(async (d: SessionComp) => {
        setSession(d);
        const visibleComp = COMPONENTES.find(c =>
          d.isSuperAdmin || d.permisos?.some((p: SessionPermiso) => p.componenteId === c.id && p.puedeVer)
        );
        const initialCompId = visibleComp ? visibleComp.id : '';
        setSelectedCompId(initialCompId);

        setAuthLoading(false);
      })
      .catch(() => { window.location.href = '/login'; });
  }, []);

  useEffect(() => {
    loadRequestSeq.current += 1;
    setFilterGrupo('');
    setFilterClase('');
    setPreview(null);
    setLoadedFiles({});
    setLoadingFiles({});
    setClasesConEnvio(new Set());
    setEstadoPorClase(new Map());
    setPage(1);
  }, [selectedCompId]);
  const isSuperAdmin = session?.isSuperAdmin === true;
  const isSuperCoordinador = session?.isSuperCoordinador === true;
  const puedeEliminarClases = isSuperAdmin || session?.puedeEliminarClases === true;
  const userPerm = session?.permisos?.find(p => p.componenteId === selectedCompId);

  const puedeVer = isSuperAdmin || !!userPerm?.puedeVer;
  const puedeRevisarEvidencia = isSuperAdmin || (puedeVer && (isSuperCoordinador || !!userPerm?.puedeRevisarEvidencia));
  const puedeAprobar = isSuperAdmin || puedeRevisarEvidencia || !!userPerm?.puedeAprobar;
  const puedeDevolver = isSuperAdmin || puedeRevisarEvidencia || !!userPerm?.puedeDevolver;
  const puedeReemplazar = isSuperAdmin || !!userPerm?.puedeReemplazar;
  const puedeEliminarEvidencia = isSuperAdmin || !!userPerm?.puedeEliminarEvidencia;
  const puedeSincronizarBackup = isSuperAdmin || !!userPerm?.puedeSincronizarBackup;
  const puedeExportar = isSuperAdmin || !!userPerm?.puedeExportar;

  const isReadOnly = !puedeAprobar && !puedeDevolver && !puedeReemplazar && !puedeEliminarEvidencia && !puedeSincronizarBackup;
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
      const zipName = [sub.componenteNombre, sub.grupo, sub.clase].map(s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').slice(0,25)).join('__');
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
      setDriveResultModal({ success: true, message: data.message || 'Se subiÃ³ exitosamente a Google Drive.' });
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
    deletingFile,
    updatingFechaReal,
    revisionModal,
    setRevisionModal,
    revisionObservacion,
    setRevisionObservacion,
    revisionSaving,
    revisionError,
    handleRevisionSubmit,
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
    handleManualUploadSubmit,
    handleReemplazarSubmit,
    handleSyncBackup,
    handleDeleteEvidenceFile,
    handleReviewEvidenceFile,
    handleUpdateFechaReal,
    handleDeleteSubmission,
    handleDeleteClass,
    load,
    isSuperAdmin,
    isSuperCoordinador,
    puedeEliminarClases,
    puedeVer,
    puedeAprobar,
    puedeDevolver,
    puedeReemplazar,
    puedeEliminarEvidencia,
    puedeRevisarEvidencia,
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


