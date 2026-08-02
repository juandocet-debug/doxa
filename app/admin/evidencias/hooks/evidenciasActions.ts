import type React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Preview, ReemplazoModalState, RevisionModalState, SubmisionEvidencia, TallyFile } from '../types';
import { limitWords } from '../wordLimit';

type FilesBySubmission = Record<string, { label: string; archivos: TallyFile[] }[]>;

interface EvidenciasActionsParams {
  page: number;
  selectedCompId: string;
  submissions: SubmisionEvidencia[];
  notasModal: { id: string; formId: string } | null;
  notasText: string;
  reemplazarModal: ReemplazoModalState | null;
  reemplazarMotivo: string;
  reemplazarFile: File | null;
  reemplazarFilePreview: string | null;
  manualUploadModal: SubmisionEvidencia | null;
  manualUploadLabel: string;
  manualUploadMotivo: string;
  manualUploadFile: File | null;
  manualUploadFilePreview: string | null;
  revisionModal: RevisionModalState | null;
  revisionObservacion: string;
  load: (targetPage?: number) => Promise<void>;
  setApproving: Dispatch<SetStateAction<string | null>>;
  setSubmissions: Dispatch<SetStateAction<SubmisionEvidencia[]>>;
  setPreview: Dispatch<SetStateAction<Preview | null>>;
  setNotasModal: Dispatch<SetStateAction<{ id: string; formId: string } | null>>;
  setUploadingDrive: Dispatch<SetStateAction<string | null>>;
  setDriveResultModal: Dispatch<SetStateAction<{ success: boolean; message: string } | null>>;
  setSyncingBackup: Dispatch<SetStateAction<string | null>>;
  setDeletingFile: Dispatch<SetStateAction<string | null>>;
  setUpdatingFechaReal: Dispatch<SetStateAction<string | null>>;
  setRevisionModal: Dispatch<SetStateAction<RevisionModalState | null>>;
  setRevisionObservacion: Dispatch<SetStateAction<string>>;
  setRevisionSaving: Dispatch<SetStateAction<boolean>>;
  setRevisionError: Dispatch<SetStateAction<string>>;
  setReemplazarModal: Dispatch<SetStateAction<ReemplazoModalState | null>>;
  setReemplazarError: Dispatch<SetStateAction<string>>;
  setReemplazarSaving: Dispatch<SetStateAction<boolean>>;
  setReemplazarFilePreview: Dispatch<SetStateAction<string | null>>;
  setManualUploadModal: Dispatch<SetStateAction<SubmisionEvidencia | null>>;
  setManualUploadLabel: Dispatch<SetStateAction<string>>;
  setManualUploadMotivo: Dispatch<SetStateAction<string>>;
  setManualUploadFile: Dispatch<SetStateAction<File | null>>;
  setManualUploadError: Dispatch<SetStateAction<string>>;
  setManualUploadSaving: Dispatch<SetStateAction<boolean>>;
  setManualUploadFilePreview: Dispatch<SetStateAction<string | null>>;
  setLoadedFiles: Dispatch<SetStateAction<FilesBySubmission>>;
  setFilterClase: Dispatch<SetStateAction<string>>;
}

export function useEvidenciasActions(params: EvidenciasActionsParams) {
  const {
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
  } = params;

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
      if (reemplazarModal.questionId) fd.append('questionId', reemplazarModal.questionId);
      fd.append('tallyFileUrl', reemplazarModal.tallyFileUrl);
      if (reemplazarModal.tallyFileName) fd.append('tallyFileName', reemplazarModal.tallyFileName);
      fd.append('motivo', reemplazarMotivo.trim());
      fd.append('file', reemplazarFile);
      const res = await fetch('/api/admin/evidencias/reemplazar', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir el reemplazo');
      if (reemplazarFilePreview) URL.revokeObjectURL(reemplazarFilePreview);
      setReemplazarFilePreview(null);
      setReemplazarModal(null);
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
      const res = await fetch('/api/admin/evidencias/manual-upload', { method: 'POST', body: fd });
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
      const res = await fetch('/api/admin/evidencias/sync-backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ formId: sub.formId, submissionId: sub.submissionId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al respaldar evidencias');
      setLoadedFiles(prev => {
        const next = { ...prev };
        delete next[sub.submissionId];
        return next;
      });
      load(page);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al respaldar evidencias');
    } finally {
      setSyncingBackup(null);
    }
  }

  async function handleDeleteEvidenceFile(sub: SubmisionEvidencia, archivo: TallyFile & { label: string }) {
    const targetUrl = archivo.originalUrl || archivo.url;
    if (!confirm(`¿Eliminar esta evidencia? Se quitará de la vista, la base de datos y los respaldos asociados.`)) return;
    setDeletingFile(targetUrl);
    try {
      const res = await fetch('/api/admin/evidencias/file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: sub.formId, tallySubmissionId: sub.submissionId, questionId: archivo.questionId ?? null, questionLabel: archivo.label, tallyFileUrl: targetUrl, tallyFileName: archivo.originalName || archivo.name, mimeType: archivo.mimeType, size: archivo.size }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar la evidencia');
      setPreview(prev => (prev?.url === (archivo.downloadUrl || archivo.url) ? null : prev));
      setLoadedFiles(prev => {
        const groups = prev[sub.submissionId] || [];
        return { ...prev, [sub.submissionId]: groups.map(group => ({ ...group, archivos: group.archivos.filter(file => (file.originalUrl || file.url) !== targetUrl) })).filter(group => group.archivos.length > 0) };
      });
      load(page);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar la evidencia');
    } finally {
      setDeletingFile(null);
    }
  }

  function handleReviewEvidenceFile(sub: SubmisionEvidencia, archivo: TallyFile & { label: string }, estadoRevision: 'cumple' | 'no_cumple') {
    setRevisionObservacion(estadoRevision === 'no_cumple' ? limitWords(archivo.observacionRevision || '') : '');
    setRevisionError('');
    setRevisionModal({ submission: sub, archivo, estadoRevision });
  }

  async function handleRevisionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!revisionModal) return;
    const { submission: sub, archivo, estadoRevision } = revisionModal;
    const observacionRevision = limitWords(revisionObservacion) || null;
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
        body: JSON.stringify({ formId: sub.formId, tallySubmissionId: sub.submissionId, questionId: archivo.questionId ?? null, questionLabel: archivo.label, tallyFileUrl: targetUrl, tallyFileName: archivo.originalName || archivo.name, estadoRevision, observacionRevision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo revisar la evidencia');
      setLoadedFiles(prev => {
        const groups = prev[sub.submissionId] || [];
        return { ...prev, [sub.submissionId]: groups.map(group => ({ ...group, archivos: group.archivos.map(file => (file.originalUrl || file.url) !== targetUrl ? file : { ...file, estadoRevision, observacionRevision, correctionPending: false }) })) };
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
    if (!confirm('¿Estás seguro de que deseas eliminar esta entrega de evidencias? Esta acción eliminará los metadatos y respaldos.')) return;
    try {
      const res = await fetch(`/api/admin/evidencias?submissionId=${submissionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar la entrega');
      setPreview(null);
      load(page);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al eliminar');
    }
  }

  async function handleDeleteClass(clase: string) {
    if (!confirm(`¿Estás seguro de que deseas eliminar la clase "${clase}"? Se eliminarán TODAS las entregas y evidencias de esta clase.`)) return;
    try {
      const res = await fetch(`/api/admin/evidencias?clase=${encodeURIComponent(clase)}&componente=${encodeURIComponent(selectedCompId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar la clase');
      setFilterClase('');
      load(1);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al eliminar la clase');
    }
  }

  async function handleSaveNotas() {
    if (!notasModal) return;
    setApproving(notasModal.id);
    const subEstado = submissions.find(s => s.submissionId === notasModal.id)?.estado ?? 'pendiente';
    try {
      const res = await fetch(`/api/admin/evidencias/${notasModal.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: subEstado, formId: notasModal.formId, notas: notasText }) });
      if (!res.ok) throw new Error();
      setSubmissions(prev => prev.map(s => s.submissionId === notasModal.id ? { ...s, notas: notasText } : s));
      setNotasModal(null);
    } catch {
      alert('No se pudo guardar la nota');
    } finally {
      setApproving(null);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  async function handleUploadToDrive(sub: SubmisionEvidencia) {
    setUploadingDrive(sub.submissionId);
    try {
      const zipName = [sub.componenteNombre, sub.grupo, sub.clase].map(s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 25)).join('__');
      const res = await fetch('/api/admin/drive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ formId: sub.formId, submissionId: sub.submissionId, zipName }) });
      const data = await res.json();
      if (!res.ok) {
        setDriveResultModal({ success: false, message: data.error === 'CONFIG_MISSING' ? data.message : data.error || 'Error al subir a Google Drive' });
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
      const res = await fetch(`/api/admin/evidencias/${sub.submissionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'aprobada', formId: sub.formId, notas: sub.notas }) });
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
      const res = await fetch(`/api/admin/evidencias/${sub.submissionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'rechazada', formId: sub.formId, notas: sub.notas }) });
      if (!res.ok) throw new Error();
      setSubmissions(prev => prev.map(s => s.submissionId === sub.submissionId ? { ...s, estado: 'rechazada' } : s));
    } catch {
      alert('Error al rechazar');
    } finally {
      setApproving(null);
    }
  }

  return {
    handleUpdateFechaReal,
    handleReemplazarSubmit,
    handleManualUploadSubmit,
    handleSyncBackup,
    handleDeleteEvidenceFile,
    handleReviewEvidenceFile,
    handleRevisionSubmit,
    handleDeleteSubmission,
    handleDeleteClass,
    handleSaveNotas,
    handleLogout,
    handleUploadToDrive,
    handleAprobar,
    handleRechazar,
  };
}
