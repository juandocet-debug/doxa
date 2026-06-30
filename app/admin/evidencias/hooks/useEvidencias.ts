import { useState, useEffect, useCallback, useRef } from 'react';
import { COMPONENTES } from '@/lib/componentes';
import { SessionComp, SubmisionEvidencia, Preview, SessionPermiso } from '../types';

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

  const load = useCallback(async () => {
    if (!selectedCompId) return;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ componente: selectedCompId });
      if (filterGrupo) params.set('grupo', filterGrupo);
      if (filterDesde) params.set('desde', filterDesde);
      if (filterHasta) params.set('hasta', filterHasta);
      const res  = await fetch(`/api/admin/evidencias?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar');
      setSubmissions(data.submissions ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setLoading(false); }
  }, [selectedCompId, filterGrupo, filterDesde, filterHasta]);

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
      load();
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
      load();
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
      load();
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
      load();
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
            const params = new URLSearchParams({ componente: initialCompId });
            const res  = await fetch(`/api/admin/evidencias?${params}`, { cache: 'no-store' });
            const data = await res.json();
            if (res.ok) setSubmissions(data.submissions ?? []);
          } catch { /* se reintenta con ↻ */ }
        }
        setAuthLoading(false);
      })
      .catch(() => { window.location.href = '/login'; });
  }, []);

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
      load();
    }
  }, [session, load]);

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

  const clasesConEnvio = new Set(submissions.map(s => s.clase));
  const estadoPorClase = new Map(submissions.map(s => [s.clase, s.estado]));
  const filtered       = submissions.filter(s => !filterClase || s.clase === filterClase);

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
    filtered,
    handleSaveNotas,
    handleLogout,
    handleUploadToDrive,
    handleAprobar,
    handleRechazar,
  };
}
