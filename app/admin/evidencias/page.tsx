'use client';

import React from 'react';
import { COMPONENTES, CLASES } from '@/lib/componentes';
import { useEvidencias } from './hooks/useEvidencias';
import { EvidenciasHeader } from './components/EvidenciasHeader';
import { EvidenciasToolbar } from './components/EvidenciasToolbar';
import { FolderCard, DetailCard } from './components/EvidenciaCard';
import { NotasModal } from './components/NotasModal';
import { ReemplazoModal } from './components/ReemplazoModal';
import { PreviewModal } from './components/PreviewModal';
import { ICONS } from './components/Icons';

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

export default function AdminEvidenciasPage() {
  const {
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
    loading,
    error,
    preview,
    setPreview,
    zoom,
    setZoom,
    pan,
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
    
    // Pagination & lazy files properties
    page,
    total,
    hasNext,
    loadedFiles,
    loadingFiles,
    fetchFilesForSubmission,
  } = useEvidencias();

  const filtered = submissions;

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

  const pageSize = 20;

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

  return (
    <div style={{ minHeight: '100vh', width: '100vw', maxWidth: '100%', overflowX: 'hidden', background: C.bg, display: 'flex', flexDirection: 'column', fontFamily: 'Inter, ui-sans-serif, sans-serif' }}>
      
      {/* Header */}
      <EvidenciasHeader
        session={session}
        isSuperAdmin={isSuperAdmin}
        isReadOnly={isReadOnly}
        currentComp={currentComp}
        loading={loading}
        load={load}
        handleLogout={handleLogout}
        sBtn={sBtn}
        C={C}
      />

      {/* Toolbar */}
      <EvidenciasToolbar
        selectedCompId={selectedCompId}
        setSelectedCompId={setSelectedCompId}
        filterGrupo={filterGrupo}
        setFilterGrupo={setFilterGrupo}
        filterDesde={filterDesde}
        setFilterDesde={setFilterDesde}
        filterHasta={filterHasta}
        setFilterHasta={setFilterHasta}
        submissions={submissions}
        clasesConEnvio={clasesConEnvio}
        currentComp={currentComp}
        isSuperAdmin={isSuperAdmin}
        session={session}
        sBtn={sBtn}
        C={C}
        COMPONENTES={COMPONENTES}
      />

      {/* Franja horizontal de clases */}
      <div style={{ background: C.filter, borderBottom: `1px solid ${C.filterBorder}`, padding: '10px 24px', flexShrink: 0, overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 'max-content' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: C.lime, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 4, whiteSpace: 'nowrap' }}>Clase:</span>
          <button onClick={() => setFilterClase('')}
            style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${!filterClase ? C.lime : C.ghostBorder}`, background: !filterClase ? 'rgba(200,255,122,0.15)' : C.ghost, color: !filterClase ? C.lime : C.textMuted, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Todas ({submissions.length})
          </button>
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

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', width: '100%' }}>
        {!puedeVer ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.surface, margin: 24, borderRadius: 12, border: `1px solid ${C.surfaceBorder}` }}>
            <p style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔒</p>
            <p style={{ color: C.textMuted, fontSize: '0.9rem' }}>No tienes permiso para ver este componente.</p>
          </div>
        ) : (
          <main style={{ flex: 1, width: '100%', overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '12px 16px', color: C.errorText, fontSize: '0.85rem' }}>{error}</div>}
            {loading && <div style={{ textAlign: 'center', padding: '80px 0', color: C.textMuted, fontSize: '0.9rem' }}>Cargando evidencias…</div>}
            {!loading && !error && filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 0', background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 12 }}>
                <p style={{ fontSize: '2.5rem', marginBottom: 8 }}>📋</p>
                <p style={{ color: C.textMuted, fontSize: '0.9rem' }}>{filterClase ? `${filterClase} aún no tiene evidencias` : 'No hay evidencias cargadas aún'}</p>
              </div>
            )}

            {/* Folder Grid View */}
            {!loading && !filterClase && filtered.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 24, alignItems: 'start' }}>
                {filtered.map(sub => {
                  const zipName = [sub.componenteNombre, sub.grupo, sub.clase]
                    .map(s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 25))
                    .join('__');
                  return (
                    <FolderCard
                      key={sub.submissionId}
                      sub={sub}
                      isSuperAdmin={isSuperAdmin}
                      handleDeleteClass={handleDeleteClass}
                      setFilterClase={setFilterClase}
                      zipName={zipName}
                      C={C}
                    />
                  );
                })}
              </div>
            )}

            {/* Detail View */}
            {!loading && !!filterClase && filtered.map(sub => {
              const zipName = [sub.componenteNombre, sub.grupo, sub.clase]
                .map(s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').slice(0,25))
                .join('__');
              return (
                <DetailCard
                  key={sub.submissionId}
                  sub={sub}
                  puedeExportar={puedeExportar}
                  puedeSincronizarBackup={puedeSincronizarBackup}
                  puedeAprobar={puedeAprobar}
                  puedeReemplazar={puedeReemplazar}
                  uploadingDrive={uploadingDrive}
                  syncingBackup={syncingBackup}
                  preview={preview}
                  setPreview={setPreview}
                  setReemplazarModal={setReemplazarModal}
                  setReemplazarMotivo={setReemplazarMotivo}
                  setReemplazarFile={setReemplazarFile}
                  setReemplazarFilePreview={setReemplazarFilePreview}
                  handleUploadToDrive={handleUploadToDrive}
                  handleSyncBackup={handleSyncBackup}
                  handleDeleteSubmission={handleDeleteSubmission}
                  setFilterClase={setFilterClase}
                  sBtn={sBtn}
                  zipName={zipName}
                  C={C}
                  loadedFiles={loadedFiles}
                  loadingFiles={loadingFiles}
                  fetchFilesForSubmission={fetchFilesForSubmission}
                />
              );
            })}

            {/* Pagination Controls */}
            {!loading && total > pageSize && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24, padding: '12px 0', borderTop: `1px solid ${C.filterBorder}` }}>
                <button
                  disabled={page <= 1}
                  onClick={() => load(page - 1)}
                  style={{ ...sBtn(), minHeight: 32, opacity: page <= 1 ? 0.5 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
                >
                  ◀ Anterior
                </button>
                <span style={{ fontSize: '0.8rem', color: C.textMuted }}>
                  Página <strong style={{ color: C.textPrimary }}>{page}</strong> de {Math.ceil(total / pageSize)} ({total} envíos en total)
                </span>
                <button
                  disabled={!hasNext}
                  onClick={() => load(page + 1)}
                  style={{ ...sBtn(), minHeight: 32, opacity: !hasNext ? 0.5 : 1, cursor: !hasNext ? 'not-allowed' : 'pointer' }}
                >
                  Siguiente ▶
                </button>
              </div>
            )}
          </main>
        )}
      </div>

      {/* Drive Result Modal */}
      {driveResultModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.surfaceBorder}`, padding: 24, borderRadius: 12, maxWidth: 400, textAlign: 'center' }}>
            <h3 style={{ color: driveResultModal.success ? '#10B981' : '#F87171', margin: '0 0 12px', fontWeight: 800 }}>
              {driveResultModal.success ? '✓ Copia Creada' : '⚠️ No se pudo subir'}
            </h3>
            <p style={{ color: C.textPrimary, fontSize: '0.85rem', margin: '0 0 20px', lineHeight: 1.4 }}>
              {driveResultModal.message}
            </p>
            <button onClick={() => setDriveResultModal(null)} style={primaryBtn}>Entendido</button>
          </div>
        </div>
      )}

      {/* Notas Modal */}
      <NotasModal
        notasModal={notasModal}
        setNotasModal={setNotasModal}
        notasText={notasText}
        setNotasText={setNotasText}
        approving={approving}
        handleSaveNotas={handleSaveNotas}
        sBtn={sBtn}
        primaryBtn={primaryBtn}
        C={C}
      />

      {/* Reemplazo Modal */}
      <ReemplazoModal
        reemplazarModal={reemplazarModal}
        setReemplazarModal={setReemplazarModal}
        reemplazarMotivo={reemplazarMotivo}
        setReemplazarMotivo={setReemplazarMotivo}
        reemplazarError={reemplazarError}
        reemplazarSaving={reemplazarSaving}
        reemplazarFilePreview={reemplazarFilePreview}
        setReemplazarFilePreview={setReemplazarFilePreview}
        reemplazarFile={reemplazarFile}
        setReemplazarFile={setReemplazarFile}
        handleReemplazarSubmit={handleReemplazarSubmit}
        sBtn={sBtn}
        primaryBtn={primaryBtn}
        C={C}
      />

      {/* Preview Modal */}
      <PreviewModal
        preview={preview}
        setPreview={setPreview}
        zoom={zoom}
        setZoom={setZoom}
        pan={pan}
        dragging={dragging}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        ICONS={ICONS}
        C={C}
      />
    </div>
  );
}
