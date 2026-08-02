'use client';

import React, { useMemo, useRef } from 'react';
import { COMPONENTES, CLASES } from '@/lib/componentes';
import { useEvidencias } from './hooks/useEvidencias';
import { EvidenciasHeader } from './components/EvidenciasHeader';
import { EvidenciasToolbar } from './components/EvidenciasToolbar';
import { DetailCard } from './components/EvidenciaCard';
import { NotasModal } from './components/NotasModal';
import { ReemplazoModal } from './components/ReemplazoModal';
import { ManualUploadModal } from './components/ManualUploadModal';
import { PreviewModal } from './components/PreviewModal';
import { RevisionModal } from './components/RevisionModal';
import { ICONS } from './components/Icons';
import { SubmisionEvidencia } from './types';

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
    
    // Pagination & lazy files properties
    page,
    total,
    hasNext,
    loadedFiles,
    loadingFiles,
    fetchFilesForSubmission,
  } = useEvidencias();

  const filtered = submissions;

  const groupSections = useMemo(() => {
    const groups = new Map<string, SubmisionEvidencia[]>();
    for (const sub of filtered) {
      const groupName = sub.grupo || 'Sin grupo';
      const items = groups.get(groupName) ?? [];
      items.push(sub);
      groups.set(groupName, items);
    }

    return Array.from(groups.entries())
      .map(([grupo, groupItems]) => {
        const classMap = new Map<string, SubmisionEvidencia[]>();
        for (const sub of groupItems) {
          const items = classMap.get(sub.clase) ?? [];
          items.push(sub);
          classMap.set(sub.clase, items);
        }

        const classes = Array.from(classMap.entries())
          .map(([clase, items]) => {
            const ordered = [...items].sort((a, b) => new Date(b.fechaEnvio).getTime() - new Date(a.fechaEnvio).getTime());
            return {
              clase,
              items: ordered,
              latest: ordered[0],
              count: ordered.length,
              estado: ordered.some(s => s.estado === 'aprobada') ? 'aprobada' : ordered.some(s => s.estado === 'rechazada') ? 'rechazada' : 'pendiente',
              backupStatus: ordered.some(s => s.backupStatus === 'failed')
                ? 'failed'
                : ordered.every(s => s.backupStatus === 'synced' || s.backupStatus === 'empty')
                  ? 'synced'
                  : ordered.some(s => s.backupStatus === 'synced' || s.backupStatus === 'partial')
                    ? 'partial'
                    : 'pending',
            };
          })
          .sort((a, b) => {
            const an = Number(a.clase.replace(/\D/g, '')) || 999;
            const bn = Number(b.clase.replace(/\D/g, '')) || 999;
            return an - bn;
          });

        const orderedItems = [...groupItems].sort((a, b) => new Date(b.fechaEnvio).getTime() - new Date(a.fechaEnvio).getTime());
        return {
          grupo,
          classes,
          items: orderedItems,
          latest: orderedItems[0],
          total: orderedItems.length,
        };
      })
      .sort((a, b) => a.grupo.localeCompare(b.grupo, 'es'));
  }, [filtered]);

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

      {/* Franja horizontal de clases */}
      <div style={{ position: 'relative', background: C.filter, borderBottom: `1px solid ${C.filterBorder}`, padding: '10px 54px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => scrollClassTabs(-1)}
          aria-label="Ver clases anteriores"
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: 999, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(3,8,5,0.94)', color: C.textPrimary, fontSize: '0.95rem', fontWeight: 900, cursor: 'pointer', zIndex: 2 }}
        >
          {'<'}
        </button>
        <button
          type="button"
          onClick={() => scrollClassTabs(1)}
          aria-label="Ver mas clases"
          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: 999, border: '1px solid rgba(255,255,255,0.16)', background: C.lime, color: '#041008', fontSize: '0.95rem', fontWeight: 900, cursor: 'pointer', zIndex: 2 }}
        >
          {'>'}
        </button>
        <div
          ref={classTabsRef}
          style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', scrollBehavior: 'smooth' }}
          className="class-tabs-rail"
        >
          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: C.lime, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>Clase:</span>
          <button onClick={() => setFilterClase('')}
            style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${!filterClase ? C.lime : C.ghostBorder}`, background: !filterClase ? 'rgba(200,255,122,0.15)' : C.ghost, color: !filterClase ? C.lime : C.textMuted, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
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
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: active ? 800 : 600, border: `1px solid ${active ? C.lime : tiene ? C.ghostBorder : 'rgba(255,255,255,0.06)'}`, background: active ? 'rgba(200,255,122,0.15)' : tiene ? C.ghost : 'rgba(255,255,255,0.03)', color: active ? C.lime : tiene ? C.textPrimary : 'rgba(255,255,255,0.2)', cursor: tiene ? 'pointer' : 'default', whiteSpace: 'nowrap', transition: 'all .12s', flexShrink: 0 }}>
                {num}
                {tiene && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
        <style>{`.class-tabs-rail::-webkit-scrollbar { display: none; }`}</style>
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
                        const backupColor = group.backupStatus === 'synced' ? '#22c55e' : group.backupStatus === 'partial' ? '#60a5fa' : '#fbbf24';
                        const backupLabel = group.backupStatus === 'synced' ? 'Respaldado' : group.backupStatus === 'partial' ? 'Parcial' : 'Pendiente';
                        return (
                          <button
                            key={group.clase}
                            type="button"
                            onClick={() => setFilterClase(group.clase)}
                            style={{
                              minHeight: 104,
                              borderRadius: 9,
                              border: '1px solid rgba(255,255,255,0.08)',
                              background: 'rgba(2,6,4,0.42)',
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
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: backupColor, flexShrink: 0 }} />
                            </div>
                            <div style={{ color: C.textMuted, fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {section.grupo}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <span style={{ color: backupColor, fontSize: '0.66rem', fontWeight: 800 }}>{backupLabel}</span>
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

            {/* Detail View */}
            {!loading && !!filterClase && (
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', color: C.lime, fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Clase seleccionada</p>
                    <h2 style={{ margin: 0, color: C.textPrimary, fontSize: '1.05rem', fontWeight: 850 }}>{filterClase}</h2>
                    <p style={{ margin: '4px 0 0', color: C.textMuted, fontSize: '0.76rem' }}>
                      {filtered.length} envio{filtered.length !== 1 ? 's' : ''} organizado{filtered.length !== 1 ? 's' : ''} por grupo.
                    </p>
                  </div>
                </div>
                {groupSections.map((section, sectionIndex) => (
                  <section key={section.grupo} style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 2px' }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: '0 0 3px', color: C.lime, fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Grupo</p>
                        <h3 style={{ margin: 0, color: C.textPrimary, fontSize: '0.95rem', fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{section.grupo}</h3>
                      </div>
                      <span style={{ color: C.textMuted, fontSize: '0.72rem', flexShrink: 0 }}>{section.total} envio{section.total !== 1 ? 's' : ''}</span>
                    </div>
                    {section.items.map((sub, index) => {
                      const zipName = [sub.componenteNombre, sub.grupo, sub.clase]
                        .map(s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').slice(0,25))
                        .join('__');
                      return (
                        <DetailCard
                          key={sub.submissionId}
                          sub={sub}
                          puedeExportar={puedeExportar}
                          puedeSincronizarBackup={puedeSincronizarBackup}
                          puedeAprobar={puedeEliminarClases}
                          puedeRevisarEvidencia={puedeRevisarEvidencia}
                          puedeReemplazar={puedeReemplazar}
                          puedeEliminarEvidencia={puedeEliminarEvidencia}
                          uploadingDrive={uploadingDrive}
                          syncingBackup={syncingBackup}
                          deletingFile={deletingFile}
                          updatingFechaReal={updatingFechaReal}
                          preview={preview}
                          setPreview={setPreview}
                          setReemplazarModal={setReemplazarModal}
                          setReemplazarMotivo={setReemplazarMotivo}
                          setReemplazarFile={setReemplazarFile}
                          setReemplazarFilePreview={setReemplazarFilePreview}
                          setManualUploadModal={setManualUploadModal}
                          setManualUploadLabel={setManualUploadLabel}
                          setManualUploadMotivo={setManualUploadMotivo}
                          setManualUploadFile={setManualUploadFile}
                          setManualUploadFilePreview={setManualUploadFilePreview}
                          handleUploadToDrive={handleUploadToDrive}
                          handleSyncBackup={handleSyncBackup}
                          handleDeleteEvidenceFile={handleDeleteEvidenceFile}
                          handleReviewEvidenceFile={handleReviewEvidenceFile}
                          handleUpdateFechaReal={handleUpdateFechaReal}
                          handleDeleteSubmission={handleDeleteSubmission}
                          setFilterClase={setFilterClase}
                          sBtn={sBtn}
                          zipName={zipName}
                          C={C}
                          loadedFiles={loadedFiles}
                          loadingFiles={loadingFiles}
                          fetchFilesForSubmission={fetchFilesForSubmission}
                          defaultOpen={sectionIndex === 0 && index === 0}
                        />
                      );
                    })}
                  </section>
                ))}
              </div>
            )}

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
      <RevisionModal modal={revisionModal} setModal={setRevisionModal} observacion={revisionObservacion} setObservacion={setRevisionObservacion} saving={revisionSaving} error={revisionError} onSubmit={handleRevisionSubmit} C={C} />

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
