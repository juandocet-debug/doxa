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

            return (
              <div key={sub.submissionId}
                style={{ background: C.surface, border: `1px solid ${estadoBorder}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 16px 60px rgba(0,0,0,0.28)' }}>

                {/* Cabecera */}
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.rowBorder}`, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ fontWeight: 700, color: C.textPrimary, margin: '0 0 2px', fontSize: '0.95rem' }}>{sub.grupo}</p>
                    <p style={{ fontWeight: 800, color: C.lime, margin: '0 0 2px', fontSize: '0.9rem' }}>{sub.clase}</p>
                    <p style={{ color: C.textMuted, margin: 0, fontSize: '0.72rem' }}>
                      {new Date(sub.fechaEnvio).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      &nbsp;· {totalArchivos} archivo{totalArchivos !== 1 ? 's' : ''}
                    </p>
                    {sub.notas && <p style={{ marginTop: 6, fontSize: '0.72rem', color: '#D8C8F6', background: 'rgba(216,200,246,0.1)', borderRadius: 6, padding: '4px 8px', display: 'inline-block' }}>📝 {sub.notas}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: estadoBg, color: estadoColor }}>● {estadoLabel}</span>
                    {!isReadOnly && (
                      <>
                        {sub.estado !== 'aprobada' && (
                          <button onClick={() => handleApprove(sub, 'aprobada')} disabled={approving === sub.submissionId} style={{ ...primaryBtn, opacity: approving === sub.submissionId ? .45 : 1 }}>
                            {approving === sub.submissionId ? '…' : '✓ Aprobar'}
                          </button>
                        )}
                        {sub.estado !== 'rechazada' && (
                          <button onClick={() => handleApprove(sub, 'rechazada')} disabled={approving === sub.submissionId} style={{ ...dangerBtn, opacity: approving === sub.submissionId ? .45 : 1 }}>
                            ✕ Rechazar
                          </button>
                        )}
                        {sub.estado !== 'pendiente' && (
                          <button onClick={() => handleApprove(sub, 'pendiente')} disabled={approving === sub.submissionId} style={{ ...sBtn(), opacity: approving === sub.submissionId ? .45 : 1, fontSize: '0.72rem' }}>Deshacer</button>
                        )}
                        <button onClick={() => { setNotasModal({ id: sub.submissionId, formId: sub.formId }); setNotasText(sub.notas ?? ''); }} style={sBtn()}>📝 Nota</button>
                      </>
                    )}
                    <a
                      href={`/api/admin/zip?formId=${sub.formId}&submissionId=${sub.submissionId}&zipName=${encodeURIComponent([sub.componenteNombre, sub.grupo, sub.clase].map(s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').slice(0,25)).join('__'))}`}
                      download
                      style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'0 12px', minHeight:32, borderRadius:8, border:'none', background:C.lime, color:'#130620', fontWeight:850, fontSize:'0.75rem', textDecoration:'none' }}>
                      📥 ZIP
                    </a>
                    <button
                      onClick={() => handleUploadToDrive(sub)}
                      disabled={uploadingDrive === sub.submissionId}
                      style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'0 12px', minHeight:32, borderRadius:8, border:'none', background: '#10B981', color:'#130620', fontWeight:850, fontSize:'0.75rem', cursor: 'pointer', opacity: uploadingDrive === sub.submissionId ? 0.6 : 1, boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
                    >
                      {uploadingDrive === sub.submissionId ? '📤 Subiendo...' : '☁️ Drive'}
                    </button>
                    <button
                      onClick={() => handleSyncBackup(sub)}
                      disabled={syncingBackup === sub.submissionId}
                      style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'0 12px', minHeight:32, borderRadius:8, border:'none', background: '#3B82F6', color:'#ffffff', fontWeight:850, fontSize:'0.75rem', cursor: 'pointer', opacity: syncingBackup === sub.submissionId ? 0.6 : 1, boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}
                    >
                      {syncingBackup === sub.submissionId ? '🔄 Respaldando...' : '🔄 Respaldar'}
                    </button>
                    <button onClick={() => setFilterClase('')} style={{ ...sBtn(), fontSize: '0.72rem' }}>← Volver</button>
                  </div>
                </div>

                {/* Fotos: fila horizontal con tamaño controlado */}
                <div style={{ padding: '12px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: 10, flexWrap: 'nowrap', overflowX: 'auto' }}>
                    {todasFotos.map((archivo, ai) => {
                      const isSelected = subPreview?.url === archivo.url;
                      return (
                        <div key={ai} className="thumb-wrap"
                          style={{ flex: '0 0 150px', width: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                          
                          {/* Image/File Container with relative positioning */}
                          <div style={{ position: 'relative', width: 150, height: 150, borderRadius: 8, overflow: 'hidden', border: isSelected ? `2px solid ${C.lime}` : `1px solid ${C.surfaceBorder}`, boxShadow: isSelected ? `0 0 0 3px rgba(200,255,122,0.22)` : 'none', transition: 'all .15s', flexShrink: 0 }}>
                            {archivo.mimeType?.startsWith('image/') ? (
                              <button
                                onClick={() => openPreview(sub, archivo, archivo.label)}
                                title="Ver en detalle"
                                style={{ width: '100%', height: '100%', cursor: 'pointer', padding: 0, background: 'none', border: 'none', display: 'block' }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={archivo.url} alt={archivo.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                {isSelected && (
                                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(200,255,122,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '1.6rem' }}>🔍</span>
                                  </div>
                                )}
                              </button>
                            ) : (
                              <div style={{ width: '100%', height: '100%', background: C.input, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '1.8rem' }}>📄</span>
                              </div>
                            )}

                            {/* Floating Replace Button */}
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
                                position: 'absolute', top: 6, right: 6,
                                width: 28, height: 28, borderRadius: '50%',
                                background: 'rgba(4,10,6,0.85)', border: `1px solid ${C.lime}`,
                                color: C.lime, fontSize: '0.85rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.5)', transition: 'all 0.2s',
                                zIndex: 5
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = C.lime; e.currentTarget.style.color = '#130620'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(4,10,6,0.85)'; e.currentTarget.style.color = C.lime; }}
                            >
                              🔄
                            </button>
                          </div>

                          <span style={{ fontSize: '0.58rem', color: C.lime, fontWeight: 700, textAlign: 'center', lineHeight: 1.2, width: '100%', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {archivo.label.replace(/fotografía\s*\d+\s*/i, '').replace(/[()]/g, '').trim() || archivo.label}
                          </span>
                          <a href={`/api/admin/proxy?url=${encodeURIComponent(archivo.url)}&name=${encodeURIComponent(archivo.name)}`}
                            download={archivo.name}
                            style={{ fontSize: '0.58rem', color: C.textMuted, textDecoration: 'none', fontWeight: 600 }}>
                            ↓ Descargar
                          </a>

                          {/* Backup Status Badge */}
                          <div style={{ marginTop: 2, display: 'flex', gap: 4, alignItems: 'center' }}>
                            {archivo.syncStatus === 'synced' ? (
                              <span style={{ fontSize: '0.53rem', color: '#10B981', fontWeight: 700 }}>
                                ☁️ Respaldado
                              </span>
                            ) : archivo.syncStatus === 'failed' ? (
                              <span title={archivo.syncError || 'Error al respaldar'} style={{ fontSize: '0.53rem', color: C.errorText, fontWeight: 700 }}>
                                ⚠️ Falla backup
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.53rem', color: '#FDE68A', fontWeight: 700 }}>
                                ⏳ Backup pend.
                              </span>
                            )}
                          </div>

                          {archivo.isReplaced && (
                            <span
                              title={`Original: ${archivo.originalName}\nMotivo: ${archivo.motivoReemplazo}`}
                              style={{
                                display: 'inline-block',
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: C.lime,
                                fontSize: '0.55rem',
                                fontWeight: 800,
                                textAlign: 'center',
                                marginTop: 4
                              }}
                            >
                              ✓ Reemplazado
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

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
