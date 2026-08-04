'use client';

import React, { useMemo, useRef } from 'react';
import { COMPONENTES } from '@/lib/componentes';
import { useEvidencias } from './hooks/useEvidencias';
import { EvidenciasHeader } from './components/EvidenciasHeader';
import { EvidenciasToolbar } from './components/EvidenciasToolbar';
import { NotasModal } from './components/NotasModal';
import { ReemplazoModal } from './components/ReemplazoModal';
import { ManualUploadModal } from './components/ManualUploadModal';
import { PreviewModal } from './components/PreviewModal';
import { RevisionModal } from './components/RevisionModal';
import { ClassTabsRail } from './components/ClassTabsRail';
import { EvidenceDetailView } from './components/EvidenceDetailView';
import { PaginationControls } from './components/PaginationControls';
import { DriveResultModal } from './components/DriveResultModal';
import { ICONS } from './components/Icons';
import { buildGroupSections } from './groupSections';
import { C, primaryBtn, sBtn } from './pageStyles';

export default function AdminEvidenciasPage() {
  const evidencias = useEvidencias();
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
    driveResultModal,
    setDriveResultModal,
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
    load,
    isSuperAdmin,
    isSuperCoordinador,
    puedeVer,
    isReadOnly,
    currentComp,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    clasesConEnvio,
    handleSaveNotas,
    handleLogout,
    
    // Pagination & lazy files properties
    page,
    total,
    hasNext,
  } = evidencias;

  const filtered = submissions;

  const groupSections = useMemo(() => buildGroupSections(filtered), [filtered]);

  const classRailRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const classTabsRef = useRef<HTMLDivElement | null>(null);

  const scrollClassTabs = (direction: -1 | 1) => {
    const rail = classTabsRef.current;
    if (!rail) return;
    const amount = Math.max(240, Math.floor(rail.clientWidth * 0.72));
    rail.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  const scrollClassRail = (grupo: string, direction: -1 | 1) => {
    const rail = classRailRefs.current[grupo];
    if (!rail) return;
    const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
    if (maxScrollLeft <= 8) return;
    const amount = Math.max(260, Math.floor(rail.clientWidth * 0.82));
    rail.scrollBy({ left: direction * amount, behavior: 'smooth' });
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
        filterClase={filterClase}
        puedeDescargarActa={isSuperAdmin || isSuperCoordinador}
      />

      <ClassTabsRail state={evidencias} classTabsRef={classTabsRef} scrollClassTabs={scrollClassTabs} />

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

            {/* Grouped Class Overview */}
            {!loading && !filterClase && filtered.length > 0 && (
              <section style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ margin: 0, color: C.textPrimary, fontSize: '1rem', fontWeight: 850 }}>Evidencias por grupo</h2>
                    <p style={{ margin: '4px 0 0', color: C.textMuted, fontSize: '0.76rem' }}>
                      {groupSections.length} grupo{groupSections.length !== 1 ? 's' : ''}. Cada bloque muestra sus clases con evidencias.
                    </p>
                  </div>
                  <span style={{ color: C.textMuted, fontSize: '0.72rem' }}>
                    {filtered.length} envio{filtered.length !== 1 ? 's' : ''} en total
                  </span>
                </div>

                {groupSections.map(section => (
                  <section key={section.grupo} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, background: 'rgba(10,18,30,0.34)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(16,185,129,0.045)' }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: '0 0 3px', color: C.lime, fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Grupo</p>
                        <h3 style={{ margin: 0, color: C.textPrimary, fontSize: '0.95rem', fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{section.grupo}</h3>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ color: C.textMuted, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                          {section.classes.length} clase{section.classes.length !== 1 ? 's' : ''} - {section.total} envio{section.total !== 1 ? 's' : ''}
                        </span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: 2, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(2,6,4,0.34)' }}>
                          <button
                            type="button"
                            onClick={() => scrollClassRail(section.grupo, -1)}
                            aria-label="Ver grupo o clases anteriores"
                            style={{ width: 28, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)', color: C.textPrimary, fontSize: '0.78rem', fontWeight: 900, cursor: 'pointer' }}
                          >
                            {'<'}
                          </button>
                          <button
                            type="button"
                            onClick={() => scrollClassRail(section.grupo, 1)}
                            aria-label="Ver siguiente grupo o mas clases"
                            style={{ width: 28, height: 26, borderRadius: 6, border: '1px solid rgba(16,185,129,0.34)', background: 'rgba(16,185,129,0.16)', color: C.lime, fontSize: '0.78rem', fontWeight: 900, cursor: 'pointer' }}
                          >
                            {'>'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <div                         ref={(el) => { classRailRefs.current[section.grupo] = el; }}
                        className="group-class-rail"
                        style={{
                          display: 'grid',
                          gridAutoFlow: 'column',
                          gridAutoColumns: 'minmax(188px, 228px)',
                          gap: 10,
                          padding: 12,
                          overflowX: 'auto',
                          overscrollBehaviorX: 'contain',
                          scrollSnapType: 'x mandatory',
                          scrollbarWidth: 'none',
                          msOverflowStyle: 'none',
                          alignItems: 'stretch',
                        }}
                      >
                      {section.classes.map(group => {
                        const isDuplicatedClass = group.count > 1;
                        const classApproved = !isDuplicatedClass && group.reviewComplete;
                        const statusColor = isDuplicatedClass ? '#60a5fa' : classApproved ? '#34d399' : group.reviewNoCumple ? '#f87171' : '#fbbf24';
                        const statusLabel = isDuplicatedClass ? 'Parcial' : classApproved ? 'Cumple · Aprobada' : group.reviewNoCumple ? 'No cumple' : group.reviewCumple ? 'En revisión' : 'Pendiente';
                        const cardBorder = classApproved ? '1px solid rgba(52,211,153,0.55)' : '1px solid rgba(255,255,255,0.08)';
                        const cardBackground = classApproved ? 'linear-gradient(135deg, rgba(16,185,129,0.24), rgba(2,78,51,0.52))' : 'rgba(2,6,4,0.42)';
                        const codigoClase = group.codigoClase || 'Sin codigo';
                        return (
                          <button
                            key={group.clase}
                            type="button"
                            onClick={() => setFilterClase(group.clase)}
                            style={{
                              minHeight: 104,
                              borderRadius: 9,
                              border: cardBorder,
                              background: cardBackground,
                              color: C.textPrimary,
                              padding: 12,
                              cursor: 'pointer',
                              textAlign: 'left',
                              display: 'grid',
                              gap: 8,
                              scrollSnapAlign: 'start',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <strong style={{ fontSize: '0.88rem', lineHeight: 1.1 }}>{group.clase}</strong>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                            </div>
                            <span style={{ display: 'inline-flex', width: 'fit-content', padding: '3px 8px', borderRadius: 999, border: '1px solid rgba(16,185,129,0.28)', background: 'rgba(16,185,129,0.09)', color: C.lime, fontSize: '0.7rem', fontWeight: 950, letterSpacing: '0.08em' }}>
                              ID {codigoClase}
                            </span>
                            <div style={{ color: C.textMuted, fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {section.grupo}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <span style={{ color: statusColor, fontSize: '0.66rem', fontWeight: 800 }}>{statusLabel}</span>
                              <span style={{ color: C.textMuted, fontSize: '0.64rem' }}>{group.count} envio{group.count !== 1 ? 's' : ''}</span>
                            </div>
                          </button>
                        );
                      })}
                      </div>
                      <style>{`.group-class-rail::-webkit-scrollbar { display: none; }`}</style>
                    </div>
                  </section>
                ))}
              </section>
            )}

            {!loading && !!filterClase && (
              <EvidenceDetailView state={evidencias} groupSections={groupSections} />
            )}

            <PaginationControls loading={loading} total={total} pageSize={pageSize} page={page} hasNext={hasNext} load={load} />
          </main>
        )}
      </div>

      <RevisionModal modal={revisionModal} setModal={setRevisionModal} observacion={revisionObservacion} setObservacion={setRevisionObservacion} saving={revisionSaving} error={revisionError} onSubmit={handleRevisionSubmit} C={C} />
      <DriveResultModal result={driveResultModal} onClose={() => setDriveResultModal(null)} />
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

      {/* Manual Upload Modal */}
      <ManualUploadModal
        manualUploadModal={manualUploadModal}
        setManualUploadModal={setManualUploadModal}
        manualUploadLabel={manualUploadLabel}
        setManualUploadLabel={setManualUploadLabel}
        manualUploadMotivo={manualUploadMotivo}
        setManualUploadMotivo={setManualUploadMotivo}
        manualUploadFile={manualUploadFile}
        setManualUploadFile={setManualUploadFile}
        manualUploadFilePreview={manualUploadFilePreview}
        setManualUploadFilePreview={setManualUploadFilePreview}
        manualUploadError={manualUploadError}
        manualUploadSaving={manualUploadSaving}
        handleManualUploadSubmit={handleManualUploadSubmit}
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
