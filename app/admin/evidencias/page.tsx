'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { COMPONENTES, CLASES } from '@/lib/componentes';

interface TallyFile {
  id: string;
  name: string;
  url: string;
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

interface SubmisionEvidencia {
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

interface Preview {
  submissionId: string;
  url: string;
  name: string;
  label: string;
}

const ICONS = {
  Folder: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', color: '#FBBF24' }}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="currentColor"/>
    </svg>
  ),
  Calendar: ({ size = 12 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  File: ({ size = 12 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  Download: ({ size = 13 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Eye: ({ size = 13 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Shield: ({ size = 13, filled = false }: { size?: number; filled?: boolean }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Sync: ({ size = 13 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Back: ({ size = 13 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  Cloud: ({ size = 13 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="currentColor" />
    </svg>
  ),
  Hourglass: ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M5 2h14" />
      <path d="M5 22h14" />
      <path d="M19 2v4c0 1.38-1.13 2.5-2.5 2.5S14 7.38 14 6V2" />
      <path d="M12 12c-1.38 0-2.5-1.13-2.5-2.5S10.63 7 12 7" />
      <path d="M12 12c1.38 0 2.5 1.13 2.5 2.5S13.38 17 12 17" />
      <path d="M5 22v-4c0-1.38 1.13-2.5 2.5-2.5S10 16.62 10 18v4" />
    </svg>
  ),
  Zip: ({ size = 13 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Lock: ({ size = 10 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Note: ({ size = 12 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
};

const C = {
  bg:            'linear-gradient(135deg, #020604 0%, #06110a 52%, #0b2214 100%)',
  surface:       'rgba(4,10,6,0.92)',
  surfaceBorder: 'rgba(16,185,129,0.22)',
  filter:        'rgba(3,8,5,0.8)',
  filterBorder:  'rgba(255,255,255,0.1)',
  ghost:         'rgba(255,255,255,0.06)',
  ghostBorder:   'rgba(255,255,255,0.1)',
  input:         'rgba(255,255,255,0.04)',
  inputBorder:   'rgba(255,255,255,0.08)',
  lime:          '#10B981', // Emerald green
  textPrimary:   '#F2FFF6',
  textMuted:     '#9CB0A4',
  rowBorder:     'rgba(255,255,255,0.06)',
  errorBg:       'rgba(239, 68, 68, 0.12)',
  errorBorder:   'rgba(239, 68, 68, 0.28)',
  errorText:     '#FCA5A5',
  previewBg:     'rgba(1,4,2,0.97)',
};

const PAGE_SIZE = 5;

interface SessionComp {
  compId: string;
  nombre: string;
  formId: string;
  grupos: string[];
}

export default function AdminEvidenciasPage() {
  const [session, setSession]         = useState<SessionComp | null>(null);
  const [selectedCompId, setSelectedCompId] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterClase, setFilterClase] = useState('');
  const [filterDesde, setFilterDesde] = useState('');
  const [filterHasta, setFilterHasta] = useState('');
  const [clasePage, setClasePage]     = useState(0);
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

  // Verificar sesión y cargar datos en una sola pasada
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(async (d: SessionComp) => {
        setSession(d);
        const initialCompId = d.compId === 'verificador' ? 'comp1' : d.compId;
        setSelectedCompId(initialCompId);
        // Cargar submissions inmediatamente con el componente de sesión
        try {
          const params = new URLSearchParams({ componente: initialCompId });
          const res  = await fetch(`/api/admin/evidencias?${params}`, { cache: 'no-store' });
          const data = await res.json();
          if (res.ok) setSubmissions(data.submissions ?? []);
        } catch { /* se reintenta con ↻ */ }
        setAuthLoading(false);
      })
      .catch(() => { window.location.href = '/login'; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isReadOnly = session?.compId === 'verificador';
  const currentComp = COMPONENTES.find(c => c.id === selectedCompId) ?? null;

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

  useEffect(() => {
    if (session) {
      Promise.resolve().then(() => {
        load();
      });
    }
  }, [session, load]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setFilterClase('');
      setClasePage(0);
      setPreview(null);
    });
  }, [filterGrupo]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setPreview(null);
    });
  }, [filterClase]);

  // Reset zoom/pan when preview image changes
  useEffect(() => {
    Promise.resolve().then(() => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    });
  }, [preview?.url]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  // Zoom with mouse wheel
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom(z => Math.min(8, Math.max(0.5, z - e.deltaY * 0.001)));
  }

  // Pan: drag handlers
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

  const totalPages     = Math.ceil(CLASES.length / PAGE_SIZE);
  const clasesPage     = CLASES.slice(clasePage * PAGE_SIZE, (clasePage + 1) * PAGE_SIZE);
  const clasesConEnvio = new Set(submissions.map(s => s.clase));
  const estadoPorClase = new Map(submissions.map(s => [s.clase, s.estado]));
  const filtered       = submissions.filter(s => !filterClase || s.clase === filterClase);

  function openPreview(sub: SubmisionEvidencia, archivo: TallyFile, label: string) {
    setPreview(p =>
      p?.url === archivo.url && p.submissionId === sub.submissionId
        ? null // toggle off si es la misma
        : { submissionId: sub.submissionId, url: archivo.url, name: archivo.name, label }
    );
  }

  async function handleApprove(sub: SubmisionEvidencia, estado: 'aprobada' | 'rechazada' | 'pendiente') {
    setApproving(sub.submissionId);
    try {
      const res = await fetch(`/api/admin/evidencias/${sub.submissionId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, formId: sub.formId }),
      });
      if (!res.ok) throw new Error();
      setSubmissions(prev => prev.map(s => s.submissionId === sub.submissionId ? { ...s, estado } : s));
    } catch { alert('No se pudo actualizar el estado'); }
    finally { setApproving(null); }
  }

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

  const sBtn = (active = false): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '0 14px', minHeight: 34, borderRadius: 8,
    border: `1px solid ${C.ghostBorder}`, background: active ? C.lime : C.ghost,
    color: active ? '#130620' : C.textPrimary, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
  });
  const primaryBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '0 14px', minHeight: 32, borderRadius: 8, border: 'none',
    background: C.lime, color: '#130620', fontWeight: 850, fontSize: '0.78rem', cursor: 'pointer',
  };
  const dangerBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '0 12px', minHeight: 32, borderRadius: 8,
    border: `1px solid ${C.errorBorder}`, background: C.errorBg,
    color: C.errorText, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
  };

  // Pantalla de carga de sesión
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center', color: C.lime }}>
          <div style={{ width: 36, height: 36, border: `3px solid rgba(200,255,122,0.2)`, borderTopColor: C.lime, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: C.textMuted, fontSize: '0.9rem' }}>Verificando sesión…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
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

  return (
    <div style={{ minHeight: '100vh', width: '100vw', maxWidth: '100%', overflowX: 'hidden', background: C.bg, display: 'flex', flexDirection: 'column', fontFamily: 'Inter, ui-sans-serif, sans-serif' }}>

      {/* Header */}
      <header style={{ background: C.filter, borderBottom: `1px solid ${C.filterBorder}`, padding: '12px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: C.lime, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>
              {isReadOnly ? 'Acceso de Consulta' : 'Panel de Coordinador'}
            </div>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 850, color: C.textPrimary, margin: 0 }}>
              {isReadOnly ? 'Verificador General' : (session?.nombre ?? 'Cargando…')}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={load} disabled={loading} style={sBtn()}>{loading ? '⟳' : '↻ Actualizar'}</button>
            <button onClick={handleLogout} style={{ ...sBtn(), color: C.errorText, borderColor: C.errorBorder }}>⎋ Cerrar sesión</button>
          </div>
        </div>
      </header>

      {/* Filtro grupo */}
      <div style={{ background: C.filter, borderBottom: `1px solid ${C.filterBorder}`, padding: '9px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {isReadOnly && (
            <select value={selectedCompId} onChange={e => { setSelectedCompId(e.target.value); setFilterGrupo(''); }}
              style={{ background: C.input, border: `1px solid ${C.inputBorder}`, borderRadius: 8, color: C.textPrimary, padding: '0 12px', minHeight: 36, fontSize: '0.82rem', outline: 'none', minWidth: 220, maxWidth: 300 }}>
              {COMPONENTES.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          )}
          <select value={filterGrupo} onChange={e => setFilterGrupo(e.target.value)}
            style={{ background: C.input, border: `1px solid ${C.inputBorder}`, borderRadius: 8, color: C.textPrimary, padding: '0 12px', minHeight: 36, fontSize: '0.82rem', outline: 'none', minWidth: 220, maxWidth: 300 }}>
            <option value="">— Todos los grupos —</option>
            {(currentComp?.grupos ?? []).map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.74rem', color: C.textMuted }}>Desde:</span>
            <input type="date" value={filterDesde} onChange={e => setFilterDesde(e.target.value)}
              style={{ background: C.input, border: `1px solid ${C.inputBorder}`, borderRadius: 8, color: C.textPrimary, padding: '0 10px', minHeight: 36, fontSize: '0.82rem', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.74rem', color: C.textMuted }}>Hasta:</span>
            <input type="date" value={filterHasta} onChange={e => setFilterHasta(e.target.value)}
              style={{ background: C.input, border: `1px solid ${C.inputBorder}`, borderRadius: 8, color: C.textPrimary, padding: '0 10px', minHeight: 36, fontSize: '0.82rem', outline: 'none' }} />
          </div>
          {(filterDesde || filterHasta) && (
            <button onClick={() => { setFilterDesde(''); setFilterHasta(''); }} style={{ ...sBtn(), fontSize: '0.75rem', padding: '0 10px', minHeight: 28 }}>
              ✕ Limpiar Fechas
            </button>
          )}
          <span style={{ fontSize: '0.74rem', color: C.textMuted }}>
            {submissions.length} envío{submissions.length !== 1 ? 's' : ''} · {clasesConEnvio.size} clase{clasesConEnvio.size !== 1 ? 's' : ''} con evidencias
          </span>
        </div>
      </div>

      {/* Franja horizontal de clases */}
      <div style={{ background: C.filter, borderBottom: `1px solid ${C.filterBorder}`, padding: '10px 24px', flexShrink: 0, overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 'max-content' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: C.lime, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 4, whiteSpace: 'nowrap' }}>Clase:</span>
          {/* Pastilla "Todas" */}
          <button onClick={() => setFilterClase('')}
            style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${!filterClase ? C.lime : C.ghostBorder}`, background: !filterClase ? 'rgba(200,255,122,0.15)' : C.ghost, color: !filterClase ? C.lime : C.textMuted, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Todas ({submissions.length})
          </button>
          {/* Una pastilla por clase */}
          {CLASES.map(c => {
            const tiene  = clasesConEnvio.has(c);
            const estado = estadoPorClase.get(c);
            const active = filterClase === c;
            const dotColor = estado === 'aprobada' ? '#4ade80' : estado === 'rechazada' ? '#f87171' : C.lime;
            const num = c.replace('Clase ', '');
            return (
              <button key={c} onClick={() => tiene && setFilterClase(active ? '' : c)}
                title={c}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: active ? 800 : 600, border: `1px solid ${active ? C.lime : tiene ? C.ghostBorder : 'rgba(255,255,255,0.06)'}`, background: active ? 'rgba(200,255,122,0.15)' : tiene ? C.ghost : 'rgba(255,255,255,0.03)', color: active ? C.lime : tiene ? C.textPrimary : 'rgba(255,255,255,0.2)', cursor: tiene ? 'pointer' : 'default', whiteSpace: 'nowrap', transition: 'all .12s' }}>
                {num}
                {tiene && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body: contenido a pantalla completa */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', width: '100%' }}>
        <main style={{ flex: 1, width: '100%', overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '12px 16px', color: C.errorText, fontSize: '0.85rem' }}>{error}</div>}
          {loading && <div style={{ textAlign: 'center', padding: '80px 0', color: C.textMuted, fontSize: '0.9rem' }}>Cargando evidencias…</div>}
          {!loading && !error && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 12 }}>
              <p style={{ fontSize: '2.5rem', marginBottom: 8 }}>📋</p>
              <p style={{ color: C.textMuted, fontSize: '0.9rem' }}>{filterClase ? `${filterClase} aún no tiene evidencias` : 'No hay evidencias cargadas aún'}</p>
            </div>
          )}

          {/* ── Vista GRID: carpetas por clase ── */}
          {!loading && !filterClase && filtered.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 24, alignItems: 'start' }}>
              {filtered.map(sub => {
                const totalFotos  = sub.fotos.reduce((a, f) => a + f.archivos.length, 0);
                const estadoColor = sub.estado === 'aprobada' ? '#4ade80' : sub.estado === 'rechazada' ? '#f87171' : '#fbbf24';
                const estadoLabel = sub.estado === 'aprobada' ? 'Aprobada' : sub.estado === 'rechazada' ? 'Rechazada' : 'Pendiente';
                const thumbs      = sub.fotos.flatMap(g => g.archivos).filter(a => a.mimeType?.startsWith('image/')).slice(0, 4);
                const zipName     = [sub.componenteNombre, sub.grupo, sub.clase]
                  .map(s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 25))
                  .join('__');

                // Color de carpeta según estado
                const folderTab  = sub.estado === 'aprobada' ? '#3a8f5a' : sub.estado === 'rechazada' ? '#8f3a3a' : '#3a5a8f';
                const folderBody = sub.estado === 'aprobada'
                  ? 'linear-gradient(160deg,#1a4a30 0%,#0f2e1c 100%)'
                  : sub.estado === 'rechazada'
                  ? 'linear-gradient(160deg,#4a1a1a 0%,#2e0f0f 100%)'
                  : 'linear-gradient(160deg,#1e3a6e 0%,#0f1f3c 100%)';

                return (
                  <div key={sub.submissionId} className="folder-card"
                    style={{ position: 'relative', paddingTop: 20, cursor: 'pointer' }}
                    onClick={() => setFilterClase(sub.clase)}>

                    {/* Pestaña de carpeta */}
                    <div style={{
                      position: 'absolute', top: 0, left: 18,
                      width: 90, height: 22,
                      background: folderTab,
                      borderRadius: '10px 10px 0 0',
                      zIndex: 1,
                    }} />

                    {/* Cuerpo de carpeta */}
                    <div style={{
                      background: folderBody,
                      borderRadius: '0 12px 12px 12px',
                      border: `1px solid rgba(255,255,255,0.1)`,
                      overflow: 'hidden',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      transition: 'transform .12s, box-shadow .12s',
                    }}>

                      {/* Grid de miniaturas */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: 130, gap: 2, padding: 12, paddingBottom: 8 }}>
                        {thumbs.length > 0
                          ? thumbs.map((f, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={f.url} alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6, display: 'block' }} />
                          ))
                          : (
                            <div style={{ gridColumn: '1/-1', gridRow: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', opacity: 0.4 }}>
                              📂
                            </div>
                          )
                        }
                        {/* Rellena espacios vacíos si hay menos de 4 */}
                        {thumbs.length > 0 && thumbs.length < 4 && Array.from({ length: 4 - thumbs.length }).map((_, i) => (
                          <div key={`empty-${i}`} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} />
                        ))}
                      </div>

                      {/* Info */}
                      <div style={{ padding: '8px 14px 12px' }}>
                        <p style={{ margin: '0 0 2px', fontSize: '1.05rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                          {sub.clase}
                        </p>
                        <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {totalFotos} archivo{totalFotos !== 1 ? 's' : ''}
                        </p>

                        {/* Estado + fecha */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', fontWeight: 700, color: estadoColor }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: estadoColor, flexShrink: 0 }} />
                            {estadoLabel}
                          </span>
                          <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.28)' }}>
                            {new Date(sub.fechaEnvio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>

                        {/* Botones */}
                        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => setFilterClase(sub.clase)}
                            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '0 10px', minHeight: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>
                            Abrir
                          </button>
                          <a
                            href={`/api/admin/zip?formId=${sub.formId}&submissionId=${sub.submissionId}&zipName=${encodeURIComponent(zipName)}`}
                            download={`${zipName}.zip`}
                            title={`Descargar ${sub.clase} como ZIP`}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '0 10px', minHeight: 30, borderRadius: 8, border: 'none', background: C.lime, color: '#130620', fontWeight: 850, fontSize: '0.72rem', textDecoration: 'none', flexShrink: 0 }}>
                            📥 ZIP
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Vista DETALLE: cuando hay una clase seleccionada ── */}
          {!loading && !!filterClase && filtered.map(sub => {
            const totalArchivos  = sub.fotos.reduce((a, f) => a + f.archivos.length, 0);
            const estadoColor    = sub.estado === 'aprobada' ? C.lime : sub.estado === 'rechazada' ? C.errorText : '#FDE68A';
            const estadoBg       = sub.estado === 'aprobada' ? 'rgba(200,255,122,0.12)' : sub.estado === 'rechazada' ? C.errorBg : 'rgba(253,230,138,0.12)';
            const estadoBorder   = sub.estado === 'aprobada' ? 'rgba(200,255,122,0.28)' : sub.estado === 'rechazada' ? C.errorBorder : C.surfaceBorder;
            const estadoLabel    = sub.estado === 'aprobada' ? 'Aprobada' : sub.estado === 'rechazada' ? 'Rechazada' : 'Pendiente';
            const subPreview     = preview?.submissionId === sub.submissionId ? preview : null;

            // Todas las fotos del envío en una sola lista plana para el panel
            const todasFotos = sub.fotos.flatMap(g => g.archivos.map(a => ({ ...a, label: g.label })));

            const zipName = [sub.componenteNombre, sub.grupo, sub.clase].map(s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').slice(0,25)).join('__');

            return (
              <div key={sub.submissionId}
                style={{ 
                  background: 'rgba(10,18,30,0.5)', 
                  border: '1px solid rgba(255,255,255,0.06)', 
                  borderRadius: 16, 
                  overflow: 'hidden', 
                  boxShadow: '0 20px 80px rgba(0,0,0,0.65)',
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20
                }}
              >
                {/* ── HEADER DE CLASE ── */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ 
                      width: 44, height: 44, borderRadius: '50%', 
                      background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <ICONS.Folder />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>{sub.clase}</h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontSize: '0.72rem', color: C.textMuted }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ICONS.Calendar size={12} /> {new Date(sub.fechaEnvio).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>·</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ICONS.File size={12} /> {totalArchivos} archivo{totalArchivos !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* Badge Estado del Respaldo */}
                    <div style={{ 
                      display: 'flex', alignItems: 'center', gap: 6, 
                      padding: '5px 12px', borderRadius: 20, 
                      border: '1px solid #10B981', background: 'rgba(16,185,129,0.06)',
                      color: '#10B981', fontSize: '0.72rem', fontWeight: 700
                    }}>
                      <ICONS.Shield size={13} filled={true} /> Estado del respaldo
                    </div>

                    <a
                      href={`/api/admin/zip?formId=${sub.formId}&submissionId=${sub.submissionId}&zipName=${encodeURIComponent(zipName)}`}
                      download={`${zipName}.zip`}
                      style={{ 
                        display:'inline-flex', alignItems:'center', gap:6, padding:'0 14px', minHeight:34, borderRadius:8, 
                        background: C.lime, color: '#130620', fontWeight: 850, fontSize: '0.75rem', textDecoration: 'none', transition: 'all 0.2s' 
                      }}
                      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                      onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                    >
                      <ICONS.Zip size={13} /> ZIP
                    </a>

                    <button
                      onClick={() => handleUploadToDrive(sub)}
                      disabled={uploadingDrive === sub.submissionId}
                      style={{ 
                        display:'inline-flex', alignItems:'center', gap:6, padding:'0 14px', minHeight:34, borderRadius:8, border:'none', 
                        background: '#10B981', color:'#130620', fontWeight:850, fontSize:'0.75rem', cursor: 'pointer', 
                        opacity: uploadingDrive === sub.submissionId ? 0.6 : 1, transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                      onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                    >
                      <ICONS.Cloud size={13} /> Drive
                    </button>

                    <button
                      onClick={() => handleSyncBackup(sub)}
                      disabled={syncingBackup === sub.submissionId}
                      style={{ 
                        display:'inline-flex', alignItems:'center', gap:6, padding:'0 14px', minHeight:34, borderRadius:8, 
                        background: 'rgba(59,130,246,0.15)', border: '1px solid #3B82F6', color:'#3B82F6', fontWeight:850, 
                        fontSize:'0.75rem', cursor: 'pointer', opacity: syncingBackup === sub.submissionId ? 0.6 : 1, transition: 'all 0.2s' 
                      }}
                    >
                      <ICONS.Sync size={13} /> Sincronizar
                    </button>

                    <button onClick={() => setFilterClase('')} style={{ ...sBtn(), minHeight: 34, fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <ICONS.Back size={13} /> Volver
                    </button>
                  </div>
                </div>

                {/* Subtitle / Note if present */}
                {sub.notas && (
                  <div style={{ background: 'rgba(216,200,246,0.06)', border: '1px solid rgba(216,200,246,0.12)', borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem', color: '#D8C8F6', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ICONS.Note size={14} /> <strong>Observación:</strong> {sub.notas}
                  </div>
                )}

                {/* ── CARD GRID ── */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', 
                  gap: 20, 
                  marginTop: 10 
                }}>
                  {todasFotos.map((archivo, ai) => {
                    const isSelected = subPreview?.url === archivo.url;
                    
                    // Determine file type badge info
                    const fileExt = (archivo.name.split('.').pop() || '').toLowerCase();
                    let badgeBg = 'rgba(107, 114, 128, 0.15)';
                    let badgeColor = '#9CA3AF';
                    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt)) {
                      if (fileExt === 'png') {
                        badgeBg = 'rgba(52, 211, 153, 0.15)';
                        badgeColor = '#34D399';
                      } else {
                        badgeBg = 'rgba(167, 139, 250, 0.15)';
                        badgeColor = '#A78BFA';
                      }
                    } else if (fileExt === 'pdf') {
                      badgeBg = 'rgba(239, 68, 68, 0.15)';
                      badgeColor = '#EF4444';
                    }

                    // Format file size
                    const sizeMB = archivo.size ? (archivo.size / (1024 * 1024)).toFixed(1) + ' MB' : '0.0 MB';

                    return (
                      <div 
                        key={ai} 
                        style={{ 
                          background: 'rgba(13,20,30,0.45)', 
                          border: isSelected ? `1.5px solid ${C.lime}` : '1.5px solid rgba(255,255,255,0.06)', 
                          borderRadius: 12, 
                          padding: 14,
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: 12,
                          position: 'relative',
                          transition: 'all 0.2s',
                          boxShadow: isSelected ? '0 0 20px rgba(200,255,122,0.1)' : 'none'
                        }}
                      >
                        {/* Preview Area */}
                        <div style={{ 
                          position: 'relative', 
                          width: '100%', 
                          height: 140, 
                          borderRadius: 8, 
                          overflow: 'hidden', 
                          background: C.input,
                          border: '1px solid rgba(255,255,255,0.04)'
                        }}>
                          {archivo.mimeType?.startsWith('image/') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={archivo.url} alt={archivo.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted }}>
                              <ICONS.File size={40} />
                            </div>
                          )}

                          {/* Top-Left: Checkmark badge if synced/active */}
                          {(archivo.syncStatus === 'synced' || archivo.isReplaced) && (
                            <div style={{ 
                              position: 'absolute', top: 8, left: 8, 
                              width: 22, height: 22, borderRadius: '50%', 
                              background: '#10B981', color: '#fff', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              fontSize: '0.75rem', fontWeight: 'bold',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                            }}>
                              ✓
                            </div>
                          )}

                          {/* Top-Right: Floating Replace Action Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReemplazarModal({
                                submissionId: sub.submissionId,
                                formId: sub.formId,
                                questionId: null,
                                tallyFileUrl: archivo.originalUrl || archivo.url,
                                tallyFileName: archivo.originalName || archivo.name,
                                currentName: archivo.name,
                                currentUrl: archivo.url,
                              });
                              setReemplazarMotivo('');
                              setReemplazarFile(null);
                              setReemplazarError('');
                              setReemplazarFilePreview(null);
                            }}
                            title="Reemplazar esta evidencia"
                            style={{
                              position: 'absolute', top: 8, right: 8,
                              width: 26, height: 26, borderRadius: '50%',
                              background: 'rgba(15,23,42,0.85)', border: `1px solid ${C.lime}`,
                              color: C.lime, fontSize: '0.8rem', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.4)', transition: 'all 0.2s',
                              zIndex: 5
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = C.lime; e.currentTarget.style.color = '#130620'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.85)'; e.currentTarget.style.color = C.lime; }}
                          >
                            <ICONS.Sync size={12} />
                          </button>
                        </div>

                        {/* Card Content */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                          {/* File Type Badge */}
                          <span style={{ 
                            alignSelf: 'flex-start',
                            fontSize: '0.58rem', fontWeight: 800, 
                            padding: '2px 6px', borderRadius: 4, 
                            background: badgeBg, color: badgeColor,
                            textTransform: 'uppercase', letterSpacing: '0.05em'
                          }}>
                            {fileExt || 'FILE'}
                          </span>

                          {/* File Label / Name */}
                          <h4 style={{ 
                            fontSize: '0.82rem', fontWeight: 700, color: '#fff', 
                            margin: '4px 0 2px', lineHeight: 1.3,
                            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                          }}>
                            {archivo.label.replace(/fotografía\s*\d+\s*/i, '').replace(/[()]/g, '').trim() || archivo.label}
                          </h4>

                          {/* Date and Size */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.66rem', color: C.textMuted }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ICONS.Calendar size={11} /> {new Date(sub.fechaEnvio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
                            <span>|</span>
                            <span>💾 {sizeMB}</span>
                          </div>

                          {/* Badges block */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                            {archivo.isReplaced && (
                              <span
                                title={`Original: ${archivo.originalName}\nMotivo: ${archivo.motivoReemplazo}`}
                                style={{
                                  display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                                  background: 'rgba(16, 185, 129, 0.12)', color: '#34D399',
                                  fontSize: '0.62rem', fontWeight: 700, border: '1px solid rgba(52,211,153,0.2)'
                                }}
                              >
                                ✓ Reemplazado
                              </span>
                            )}

                            {archivo.syncStatus === 'synced' ? (
                              <span style={{ 
                                display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                                background: 'rgba(59,130,246,0.1)', color: '#60A5FA',
                                fontSize: '0.62rem', fontWeight: 700, border: '1px solid rgba(96,165,250,0.2)',
                                alignItems: 'center', gap: 4
                              }}>
                                <ICONS.Cloud size={11} /> Respaldado
                              </span>
                            ) : archivo.syncStatus === 'failed' ? (
                              <span 
                                title={archivo.syncError || 'Error al respaldar'} 
                                style={{ 
                                  display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                                  background: 'rgba(239,68,68,0.1)', color: '#F87171',
                                  fontSize: '0.62rem', fontWeight: 700, border: '1px solid rgba(248,113,113,0.2)',
                                  alignItems: 'center', gap: 4
                                }}
                              >
                                <ICONS.Shield size={11} /> Falla backup
                              </span>
                            ) : (
                              <span style={{ 
                                display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                                background: 'rgba(245,158,11,0.1)', color: '#FBBF24',
                                fontSize: '0.62rem', fontWeight: 700, border: '1px solid rgba(251,191,36,0.2)',
                                alignItems: 'center', gap: 4
                              }}>
                                <ICONS.Hourglass size={11} /> Backup pend.
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons inside card (flex row) */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <a 
                            href={`/api/admin/proxy?url=${encodeURIComponent(archivo.url)}&name=${encodeURIComponent(archivo.name)}`}
                            download={archivo.name}
                            style={{ 
                              flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              padding: '6px 10px', borderRadius: 6, background: archivo.syncStatus === 'synced' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                              color: archivo.syncStatus === 'synced' ? '#34D399' : '#60A5FA', fontSize: '0.72rem', fontWeight: 700,
                              textDecoration: 'none', transition: 'all 0.2s', textAlign: 'center'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = archivo.syncStatus === 'synced' ? '#10B981' : '#3B82F6'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = archivo.syncStatus === 'synced' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)'; e.currentTarget.style.color = archivo.syncStatus === 'synced' ? '#34D399' : '#60A5FA'; }}
                          >
                            <ICONS.Download size={13} /> Descargar
                          </a>
                          
                          <button
                            onClick={() => setPreview({ submissionId: sub.submissionId, url: archivo.url, name: archivo.name, label: archivo.label })}
                            style={{ 
                              flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              padding: '6px 10px', borderRadius: 6, background: 'transparent',
                              border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.72rem', fontWeight: 600,
                              cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <ICONS.Eye size={13} /> Revisar
                          </button>
                        </div>

                        {/* Bottom divider clock line */}
                        <div style={{ 
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                          fontSize: '0.62rem', color: C.textMuted, borderTop: '1px solid rgba(255,255,255,0.04)', 
                          marginTop: 2, paddingTop: 6 
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {archivo.syncStatus === 'synced' ? (
                              <><ICONS.Shield size={11} filled={true} /> Respaldo al día</>
                            ) : (
                              <><ICONS.Calendar size={11} /> Auto-respaldo activo</>
                            )}
                          </span>
                          <ICONS.Lock size={10} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── BOTTOM STATS SUMMARY PANEL ── */}
                {(() => {
                  const syncedCount = todasFotos.filter(f => f.syncStatus === 'synced').length;
                  const pendingCount = todasFotos.length - syncedCount;
                  const percent = todasFotos.length > 0 ? Math.round((syncedCount / todasFotos.length) * 100) : 0;
                  
                  return (
                    <div style={{ 
                      display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
                      background: 'rgba(13,20,30,0.65)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 12, padding: '16px 24px', marginTop: 24, gap: 16
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <ICONS.File size={18} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>{totalArchivos} archivos</p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: C.textMuted }}>En esta clase</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                          <ICONS.Shield size={18} filled={true} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>{syncedCount} respaldo{syncedCount !== 1 ? 's' : ''} al día</p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: C.textMuted }}>Todo respaldado</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FBBF24' }}>
                          <ICONS.Hourglass size={18} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>{pendingCount} respaldo{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}</p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: C.textMuted }}>Programados hoy</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        {/* Circular Progress Ring */}
                        <div style={{ position: 'relative', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                            <circle cx="21" cy="21" r="18" fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                            <circle cx="21" cy="21" r="18" fill="transparent" stroke="#10B981" strokeWidth="3" 
                              strokeDasharray={`${2 * Math.PI * 18}`}
                              strokeDashoffset={`${2 * Math.PI * 18 * (1 - percent / 100)}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span style={{ position: 'absolute', fontSize: '0.68rem', fontWeight: 850, color: '#fff' }}>{percent}%</span>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>Estado general</p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>
                            {percent === 100 ? 'Excelente' : percent > 50 ? 'Muy bueno' : 'Sincronizando...'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                  {/* ── Visor interno con zoom + arrastre ── */}
                  {subPreview && (
                    <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', border: `1px solid rgba(200,255,122,0.25)`, background: C.previewBg }}>

                      {/* Barra de controles */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: `1px solid ${C.rowBorder}`, gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: C.lime, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Previsualización</span>
                          <p style={{ margin: '1px 0 0', fontSize: '0.75rem', color: C.textPrimary, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subPreview.label}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                          {/* Nav fotos */}
                          <button onClick={() => { const i = todasFotos.findIndex(f => f.url === subPreview.url); const p = todasFotos[(i - 1 + todasFotos.length) % todasFotos.length]; setPreview({ submissionId: sub.submissionId, url: p.url, name: p.name, label: p.label }); }} style={sBtn()}>‹</button>
                          <span style={{ fontSize: '0.7rem', color: C.textMuted, minWidth: 32, textAlign: 'center' }}>{todasFotos.findIndex(f => f.url === subPreview.url) + 1}/{todasFotos.length}</span>
                          <button onClick={() => { const i = todasFotos.findIndex(f => f.url === subPreview.url); const n = todasFotos[(i + 1) % todasFotos.length]; setPreview({ submissionId: sub.submissionId, url: n.url, name: n.name, label: n.label }); }} style={sBtn()}>›</button>
                          {/* Zoom */}
                          <button onClick={() => setZoom(z => Math.min(8, z + 0.25))} style={sBtn()} title="Acercar">＋</button>
                          <span style={{ fontSize: '0.7rem', color: C.textMuted, minWidth: 34, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} style={sBtn()} title="Alejar">－</button>
                          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={sBtn()} title="Restablecer">⊙</button>
                          {/* Descarga y cerrar */}
                          <a href={`/api/admin/proxy?url=${encodeURIComponent(subPreview.url)}&name=${encodeURIComponent(subPreview.name)}`} download={subPreview.name} style={{ ...primaryBtn, textDecoration: 'none' }}>↓</a>
                          <button onClick={() => setPreview(null)} style={{ ...sBtn(), padding: '0 10px' }} title="Cerrar (ESC)">×</button>
                        </div>
                      </div>

                      {/* Área de imagen — zoom + arrastre */}
                      <div
                        onWheel={onWheel}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                        style={{ height: 420, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.previewBg, cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={subPreview.url}
                          alt={subPreview.name}
                          draggable={false}
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 6, boxShadow: '0 6px 32px rgba(0,0,0,0.5)', transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: 'center center', transition: dragging ? 'none' : 'transform .1s ease', pointerEvents: 'none' }}
                        />
                      </div>
                      <p style={{ margin: 0, padding: '6px 14px', fontSize: '0.65rem', color: C.textMuted, borderTop: `1px solid ${C.rowBorder}` }}>
                        Rueda del mouse para zoom · Clic y arrastra para mover · ESC para cerrar
                      </p>
                    </div>
                  )}

                  {sub.fotos.every(f => f.archivos.length === 0) && (
                    <p style={{ color: C.textMuted, fontSize: '0.85rem', fontStyle: 'italic' }}>Sin archivos en este envío</p>
                  )}
              </div>
            );
          })}
        </main>
      </div>

      {/* Modal notas */}
      {notasModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 12, padding: 24, width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 20px 70px rgba(0,0,0,0.4)' }}>
            <h3 style={{ margin: 0, color: C.textPrimary, fontWeight: 800, fontSize: '1rem' }}>Agregar / editar nota</h3>
            <textarea value={notasText} onChange={e => setNotasText(e.target.value)} rows={4}
              placeholder="Escribe una observación..."
              style={{ width: '100%', background: C.input, border: `1px solid ${C.inputBorder}`, borderRadius: 8, color: C.textPrimary, padding: '10px 12px', fontSize: '0.85rem', resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setNotasModal(null)} style={sBtn()}>Cancelar</button>
              <button onClick={handleSaveNotas} disabled={approving === notasModal.id} style={{ ...primaryBtn, opacity: approving === notasModal.id ? .45 : 1, padding: '0 20px', minHeight: 36 }}>
                {approving === notasModal.id ? 'Guardando…' : 'Guardar nota'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de resultado de Google Drive */}
      {driveResultModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div style={{ background: C.surface, border: `1px solid ${driveResultModal.success ? C.lime : C.errorBorder}`, borderRadius: 14, padding: '24px 28px', maxWidth: 500, width: '100%', boxShadow: '0 20px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: '1.8rem' }}>{driveResultModal.success ? '✅' : '⚠️'}</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 850, color: C.textPrimary, margin: 0 }}>
                {driveResultModal.success ? 'Envío Exitoso' : 'Error de Carga'}
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: C.textMuted, lineHeight: 1.6, margin: '0 0 20px' }}>
              {driveResultModal.message}
            </p>
            {!driveResultModal.success && driveResultModal.message.includes('GOOGLE_SERVICE_ACCOUNT_JSON') && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 14, fontSize: '0.78rem', color: C.textMuted, lineHeight: 1.5, marginBottom: 20 }}>
                <strong style={{ color: C.lime }}>Instrucciones de configuración:</strong>
                <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                  <li>Crea una cuenta de servicio en Google Cloud Console.</li>
                  <li>Descarga la llave en formato JSON.</li>
                  <li>Agrega la variable <code style={{ color: C.lime }}>GOOGLE_SERVICE_ACCOUNT_JSON</code> en Railway/Vercel con el JSON completo.</li>
                  <li>Crea una carpeta en Google Drive, compártela con el email de la cuenta de servicio y agrega su ID en <code style={{ color: C.lime }}>GOOGLE_DRIVE_FOLDER_ID</code>.</li>
                </ol>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setDriveResultModal(null)} style={{ ...primaryBtn, padding: '0 20px', minHeight: 36 }}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reemplazar Evidencia */}
      {reemplazarModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleReemplazarSubmit} style={{ background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 12, padding: 24, width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 20px 70px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: 0, color: C.textPrimary, fontWeight: 800, fontSize: '1.1rem' }}>🔄 Reemplazar Evidencia</h3>
            
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '0.74rem', color: C.textMuted }}>Archivo Actual:</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: C.lime, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {reemplazarModal.currentName}
              </p>
            </div>

            {/* Drag & Drop Zone */}
            <div 
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) {
                  setReemplazarFile(f);
                  if (f.type.startsWith('image/')) {
                    setReemplazarFilePreview(URL.createObjectURL(f));
                  } else {
                    setReemplazarFilePreview(null);
                  }
                }
              }}
              style={{ 
                border: `2px dashed ${C.surfaceBorder}`, 
                borderRadius: 10, 
                padding: '30px 20px', 
                textAlign: 'center', 
                background: 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 160
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.lime; e.currentTarget.style.background = 'rgba(200,255,122,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.surfaceBorder; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input 
                id="file-input"
                type="file" 
                required
                accept="image/*,application/pdf"
                onChange={e => {
                  const f = e.target.files?.[0] || null;
                  setReemplazarFile(f);
                  if (f && f.type.startsWith('image/')) {
                    setReemplazarFilePreview(URL.createObjectURL(f));
                  } else {
                    setReemplazarFilePreview(null);
                  }
                }}
                style={{ display: 'none' }}
              />
              {reemplazarFilePreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={reemplazarFilePreview} alt="Vista previa" style={{ maxWidth: '100%', maxHeight: 130, objectFit: 'contain', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} />
                  <span style={{ fontSize: '0.78rem', color: C.lime, fontWeight: 700 }}>{reemplazarFile?.name}</span>
                </div>
              ) : reemplazarFile ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '3rem' }}>📄</span>
                  <span style={{ fontSize: '0.78rem', color: C.lime, fontWeight: 700 }}>{reemplazarFile.name} (PDF)</span>
                </div>
              ) : (
                <div>
                  <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: 10 }}>📤</span>
                  <span style={{ fontSize: '0.85rem', color: C.textPrimary, fontWeight: 700, display: 'block' }}>Arrastra el archivo aquí o haz clic para examinar</span>
                  <span style={{ fontSize: '0.7rem', color: C.textMuted, display: 'block', marginTop: 6 }}>Formatos: JPG, PNG, WEBP, GIF o PDF (Hasta 15MB)</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', margin: '0 0 6px', fontSize: '0.76rem', color: C.textMuted, fontWeight: 600 }}>Motivo del reemplazo (Obligatorio):</label>
              <textarea 
                required
                value={reemplazarMotivo} 
                onChange={e => setReemplazarMotivo(e.target.value)} 
                rows={3}
                placeholder="Escriba la razón por la que se reemplaza este archivo..."
                style={{ width: '100%', background: C.input, border: `1px solid ${C.inputBorder}`, borderRadius: 8, color: C.textPrimary, padding: '10px 12px', fontSize: '0.82rem', resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} 
              />
            </div>

            {reemplazarError && (
              <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '10px 12px', color: C.errorText, fontSize: '0.78rem' }}>
                {reemplazarError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button 
                type="button" 
                onClick={() => {
                  if (reemplazarFilePreview) URL.revokeObjectURL(reemplazarFilePreview);
                  setReemplazarFilePreview(null);
                  setReemplazarModal(null);
                }} 
                disabled={reemplazarSaving} 
                style={sBtn()}
              >
                Cancelar
              </button>
              <button type="submit" disabled={reemplazarSaving} style={{ ...primaryBtn, opacity: reemplazarSaving ? 0.5 : 1, padding: '0 20px', minHeight: 36 }}>
                {reemplazarSaving ? 'Subiendo...' : 'Confirmar Reemplazo'}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        .thumb-wrap button:hover { opacity: 0.88; transform: scale(1.03); }
        .folder-card:hover > div:last-child { transform: translateY(-3px); box-shadow: 0 14px 48px rgba(0,0,0,0.65) !important; }
        .folder-card:hover > div:first-child { filter: brightness(1.15); }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.16); border-radius: 3px; }
        select option { background: #070D0A; color: #F2FFF6; }
      `}</style>
    </div>
  );
}
