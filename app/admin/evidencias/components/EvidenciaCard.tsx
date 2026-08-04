import React, { useEffect, useState } from 'react';
import { SubmisionEvidencia, Preview, TallyFile, ReemplazoModalState } from '../types';
import { ICONS } from './Icons';
function shortObservation(value: string | null | undefined) {
  return (value || '').trim().split(/\s+/).filter(Boolean).slice(0, 20).join(' ');
}
interface DetailCardProps {
  sub: SubmisionEvidencia;
  puedeExportar: boolean;
  puedeSincronizarBackup: boolean;
  puedeAprobar: boolean;
  puedeRevisarEvidencia: boolean;
  puedeReemplazar: boolean;
  puedeEliminarEvidencia: boolean;
  uploadingDrive: string | null;
  syncingBackup: string | null;
  deletingFile: string | null;
  updatingFechaReal: string | null;
  preview: Preview | null;
  setPreview: (val: Preview | null) => void;
  setReemplazarModal: (val: ReemplazoModalState | null) => void;
  setReemplazarMotivo: (val: string) => void;
  setReemplazarFile: (val: File | null) => void;
  setReemplazarFilePreview: (val: string | null) => void;
  setManualUploadModal: (val: SubmisionEvidencia | null) => void;
  setManualUploadLabel: (val: string) => void;
  setManualUploadMotivo: (val: string) => void;
  setManualUploadFile: (val: File | null) => void;
  setManualUploadFilePreview: (val: string | null) => void;
  handleUploadToDrive: (sub: SubmisionEvidencia) => void;
  handleSyncBackup: (sub: { formId: string; submissionId: string }) => void;
  handleDeleteEvidenceFile: (sub: SubmisionEvidencia, archivo: TallyFile & { label: string }) => void;
  handleReviewEvidenceFile: (sub: SubmisionEvidencia, archivo: TallyFile & { label: string }, estadoRevision: 'cumple' | 'no_cumple') => void;
  handleUpdateFechaReal: (sub: SubmisionEvidencia, fechaActividadReal: string | null) => void;
  handleDeleteSubmission: (submissionId: string) => void;
  setFilterClase: (val: string) => void;
  sBtn: () => React.CSSProperties;
  zipName: string;
  C: Record<string, string>;
  loadedFiles: Record<string, { label: string; archivos: TallyFile[] }[]>;
  loadingFiles: Record<string, boolean>;
  fetchFilesForSubmission: (submissionId: string) => Promise<void>;
  defaultOpen?: boolean;
}
export function DetailCard({
  sub,
  puedeExportar,
  puedeSincronizarBackup,
  puedeAprobar,
  puedeRevisarEvidencia,
  puedeReemplazar,
  puedeEliminarEvidencia,
  uploadingDrive,
  syncingBackup,
  deletingFile,
  updatingFechaReal,
  preview,
  setPreview,
  setReemplazarModal,
  setReemplazarMotivo,
  setReemplazarFile,
  setReemplazarFilePreview,
  setManualUploadModal,
  setManualUploadLabel,
  setManualUploadMotivo,
  setManualUploadFile,
  setManualUploadFilePreview,
  handleUploadToDrive,
  handleSyncBackup,
  handleDeleteEvidenceFile,
  handleReviewEvidenceFile,
  handleUpdateFechaReal,
  handleDeleteSubmission,
  setFilterClase,
  sBtn,
  zipName,
  C,
  loadedFiles,
  loadingFiles,
  fetchFilesForSubmission,
  defaultOpen = false,
}: DetailCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  useEffect(() => {
    if (isOpen) {
      fetchFilesForSubmission(sub.submissionId);
    }
  }, [isOpen, sub.submissionId, fetchFilesForSubmission]);
  const filesForSub = loadedFiles[sub.submissionId] || [];
  const isLoading = loadingFiles[sub.submissionId];
  const totalArchivos = filesForSub.reduce((a, f) => a + f.archivos.length, 0);
  const todasFotos = filesForSub.flatMap(g => g.archivos.map(a => ({ ...a, label: g.label })));
  const fechaRealValue = sub.fechaActividadReal ? new Date(sub.fechaActividadReal).toISOString().slice(0, 10) : '';
  const fechaMostrada = sub.fechaActividadReal || sub.fechaEnvio;
  const shortDateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: '2-digit' };
  const [fechaRealDraft, setFechaRealDraft] = useState(fechaRealValue);
  const toggleOpen = () => setIsOpen(open => !open);
  return (
    <section style={{ background: 'rgba(10,18,30,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 14px 44px rgba(0,0,0,0.45)' }}>
      <div
        style={{ width: '100%', display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) auto auto', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'rgba(255,255,255,0.025)', borderBottom: isOpen ? '1px solid rgba(255,255,255,0.06)' : '0', color: 'inherit' }}
      >
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Cerrar' : 'Abrir'} evidencias de ${sub.grupo || 'Sin grupo'} ${sub.clase}`}
          style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, padding: 0, border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ICONS.Folder />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: '0 0 3px', color: C.lime, fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Grupo</p>
            <h2 style={{ fontSize: '1rem', fontWeight: 850, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.grupo || 'Sin grupo'}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, fontSize: '0.7rem', color: C.textMuted, flexWrap: 'wrap' }}>
              {sub.codigoClase && <><span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 999, border: '1px solid rgba(16,185,129,0.26)', background: 'rgba(16,185,129,0.075)', color: C.lime, fontSize: '0.68rem', fontWeight: 950, letterSpacing: '0.06em' }}>{sub.codigoClase}</span><span>|</span></>}
              <strong style={{ color: C.textPrimary }}>{sub.clase}</strong>
              <span>|</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ICONS.Calendar size={12} /> Real: {new Date(fechaMostrada).toLocaleDateString('es-CO')}</span>
              <span>|</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>Carga: {new Date(sub.fechaEnvio).toLocaleDateString('es-CO')}</span>
              <span>|</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ICONS.File size={12} /> {isLoading ? 'Cargando...' : `${totalArchivos} archivos`}</span>
            </div>
          </div>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, flexWrap: 'wrap' }}>
          {puedeReemplazar && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 34, padding: '0 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.035)', color: C.textMuted, fontSize: '0.7rem', fontWeight: 800 }}>
              <span>Fecha real</span>
              <input type="date" value={fechaRealDraft} disabled={updatingFechaReal === sub.submissionId} onChange={(e) => setFechaRealDraft(e.target.value)} style={{ colorScheme: 'dark', border: '1px solid rgba(16,185,129,0.28)', background: 'rgba(2,6,4,0.65)', color: C.textPrimary, borderRadius: 6, minHeight: 26, padding: '0 8px', fontWeight: 800, fontSize: '0.72rem' }} />
              <button type="button" disabled={updatingFechaReal === sub.submissionId || fechaRealDraft === fechaRealValue} onClick={() => handleUpdateFechaReal(sub, fechaRealDraft || null)} style={{ minHeight: 26, padding: '0 10px', borderRadius: 6, border: '1px solid rgba(16,185,129,0.38)', background: fechaRealDraft === fechaRealValue ? 'rgba(255,255,255,0.04)' : 'rgba(16,185,129,0.18)', color: fechaRealDraft === fechaRealValue ? C.textMuted : C.lime, fontSize: '0.68rem', fontWeight: 900, cursor: updatingFechaReal === sub.submissionId || fechaRealDraft === fechaRealValue ? 'default' : 'pointer' }}>
                {updatingFechaReal === sub.submissionId ? 'Guardando' : 'Establecer'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, border: '1px solid #10B981', background: 'rgba(16,185,129,0.06)', color: '#10B981', fontSize: '0.72rem', fontWeight: 700 }}>
            <ICONS.Shield size={13} filled={true} /> Estado del respaldo
          </div>

          {puedeExportar && (
            <>
              <a href={`/api/admin/zip?formId=${sub.formId}&submissionId=${sub.submissionId}&zipName=${encodeURIComponent(zipName)}`} download={`${zipName}.zip`} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'0 10px', minHeight:32, borderRadius:8, background: C.lime, color: '#130620', fontWeight: 850, fontSize: '0.72rem', textDecoration: 'none' }}>
                <ICONS.Zip size={13} /> ZIP
              </a>
              <button type="button" onClick={() => handleUploadToDrive(sub)} disabled={uploadingDrive === sub.submissionId} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'0 10px', minHeight:32, borderRadius:8, border:'none', background: '#10B981', color:'#130620', fontWeight:850, fontSize:'0.72rem', cursor: 'pointer', opacity: uploadingDrive === sub.submissionId ? 0.6 : 1 }}>
                <ICONS.Cloud size={13} /> Drive
              </button>
            </>
          )}

          {puedeSincronizarBackup && (
            <button type="button" onClick={() => handleSyncBackup(sub)} disabled={syncingBackup === sub.submissionId} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'0 10px', minHeight:32, borderRadius:8, background: 'rgba(59,130,246,0.15)', border: '1px solid #3B82F6', color:'#3B82F6', fontWeight:850, fontSize:'0.72rem', cursor: 'pointer', opacity: syncingBackup === sub.submissionId ? 0.6 : 1 }}>
              <ICONS.Sync size={13} /> Sincronizar
            </button>
          )}

          {puedeAprobar && (
            <button type="button" onClick={() => handleDeleteSubmission(sub.submissionId)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 10px', minHeight: 32, borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444', color: '#F87171', fontWeight: 850, fontSize: '0.72rem', cursor: 'pointer' }}>
              <ICONS.Trash size={13} /> Eliminar
            </button>
          )}

          <button type="button" onClick={() => setFilterClase('')} style={{ ...sBtn(), minHeight: 32, padding: '0 10px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <ICONS.Back size={13} /> Volver
          </button>
        </div>

        <button
          type="button"
          onClick={toggleOpen}
          aria-label={isOpen ? 'Cerrar bloque' : 'Abrir bloque'}
          style={{ justifySelf: 'end', width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: C.textMuted, cursor: 'pointer', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
        >
          v
        </button>
      </div>

      {isOpen && (
        <div style={{ padding: 20, display: 'grid', gap: 18 }}>
          {sub.notas && (
            <div style={{ background: 'rgba(216,200,246,0.06)', border: '1px solid rgba(216,200,246,0.12)', borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem', color: '#D8C8F6', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ICONS.Note size={14} /> <strong>Observacion:</strong> {sub.notas}
            </div>
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.textMuted, fontSize: '0.9rem' }}>
              <div style={{ width: 24, height: 24, border: '2px solid rgba(16,185,129,0.2)', borderTopColor: C.lime, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 10px' }} />
              Cargando archivos de evidencia...
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12, marginTop: 10 }}>
              {puedeReemplazar && (
                <button
                  type="button"
                  onClick={() => {
                    setManualUploadModal(sub);
                    setManualUploadLabel('Lista de asistencia');
                    setManualUploadMotivo('');
                    setManualUploadFile(null);
                    setManualUploadFilePreview(null);
                  }}
                  style={{ minHeight: 310, borderRadius: 12, border: `1.5px dashed ${C.lime}`, background: 'rgba(16,185,129,0.055)', color: C.lime, cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 18 }}
                >
                  <span style={{ display: 'grid', placeItems: 'center', gap: 10, textAlign: 'center' }}>
                    <span style={{ width: 54, height: 54, borderRadius: '50%', border: `1px solid ${C.lime}`, display: 'grid', placeItems: 'center', fontSize: 34, lineHeight: 1 }}>+</span>
                    <strong style={{ fontSize: '0.86rem', color: C.textPrimary }}>Agregar evidencia manual</strong>
                    <span style={{ fontSize: '0.7rem', color: C.textMuted }}>Lista de asistencia u otro soporte</span>
                  </span>
                </button>
              )}
              {todasFotos.map((archivo, ai) => {
                const isSelected = preview?.url === archivo.downloadUrl;
                const fileExt = (archivo.name.split('.').pop() || '').toLowerCase();
                let badgeBg = 'rgba(107, 114, 128, 0.15)';
                let badgeColor = '#9CA3AF';
                if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt)) {
                  badgeBg = fileExt === 'png' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(167, 139, 250, 0.15)';
                  badgeColor = fileExt === 'png' ? '#34D399' : '#A78BFA';
                } else if (fileExt === 'pdf') {
                  badgeBg = 'rgba(239, 68, 68, 0.15)';
                  badgeColor = '#EF4444';
                }
                const sizeMB = archivo.size ? (archivo.size / (1024 * 1024)).toFixed(1) + ' MB' : '0.0 MB';
                const correctionPending = archivo.correctionPending === true;
                const reviewLabel = correctionPending
                  ? 'Corregida'
                  : archivo.estadoRevision === 'cumple'
                    ? 'Cumple'
                    : archivo.estadoRevision === 'no_cumple'
                      ? 'No cumple'
                      : 'Sin revisar';
                const reviewHint = correctionPending
                  ? 'Por aprobar'
                  : archivo.estadoRevision === 'no_cumple'
                    ? 'Debe corregirse'
                    : archivo.estadoRevision === 'cumple'
                      ? 'Aprobada'
                      : 'Pendiente';
                const reviewTone = correctionPending ? 'info' : archivo.estadoRevision === 'cumple' ? 'ok' : archivo.estadoRevision === 'no_cumple' ? 'bad' : 'wait';
                const reviewColors = {
                  ok: { border: 'rgba(16,185,129,0.42)', bg: 'rgba(16,185,129,0.14)', color: '#A7F3D0' },
                  bad: { border: 'rgba(248,113,113,0.42)', bg: 'rgba(127,29,29,0.2)', color: '#FCA5A5' },
                  wait: { border: 'rgba(251,191,36,0.32)', bg: 'rgba(251,191,36,0.09)', color: '#FBBF24' },
                  info: { border: 'rgba(96,165,250,0.42)', bg: 'rgba(59,130,246,0.14)', color: '#93C5FD' },
                }[reviewTone];
                const observation = shortObservation(archivo.observacionRevision);
                const isBackedUp = archivo.syncStatus === 'synced' || archivo.isReplaced;

                return (
                  <div key={`${archivo.questionId ?? 'file'}-${archivo.downloadUrl || archivo.url}-${ai}`} style={{ background: 'rgba(13,20,30,0.45)', border: isSelected ? `1.5px solid ${C.lime}` : '1.5px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
                    <div style={{ position: 'relative', width: '100%', height: 140, borderRadius: 8, overflow: 'hidden', background: C.input, border: '1px solid rgba(255,255,255,0.04)' }}>
                      <button type="button" onClick={() => setPreview({ submissionId: sub.submissionId, url: archivo.downloadUrl || archivo.url, name: archivo.name, label: archivo.label })} style={{ width: '100%', height: '100%', cursor: 'pointer', padding: 0, background: 'none', border: 'none', display: 'block', outline: 'none' }}>
                        {archivo.mimeType?.startsWith('image/') ? (
                          <img src={archivo.url} alt={archivo.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted }}>
                            <ICONS.File size={40} />
                          </div>
                        )}
                      </button>

                      <div title={isBackedUp ? 'Respaldado en backup' : 'Backup pendiente'} style={{ position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: '50%', background: isBackedUp ? 'rgba(37,99,235,0.92)' : 'rgba(15,23,42,0.76)', border: isBackedUp ? '1px solid rgba(191,219,254,0.35)' : '1px solid rgba(255,255,255,0.18)', color: isBackedUp ? '#DBEAFE' : 'rgba(226,232,240,0.74)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px rgba(0,0,0,0.25)' }}>
                        <ICONS.Cloud size={13} />
                      </div>

                      {puedeRevisarEvidencia && (
                        <div aria-label="Acciones de revision" style={{ position: 'absolute', top: 8, left: 36, display: 'inline-flex', alignItems: 'center', overflow: 'hidden', borderRadius: 999, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(2,6,4,0.72)', boxShadow: '0 6px 14px rgba(0,0,0,0.25)' }}>
                          <button
                            type="button"
                            title="Aprobar evidencia"
                            aria-label={`Aprobar ${archivo.label}`}
                            onClick={() => handleReviewEvidenceFile(sub, archivo, 'cumple')}
                            style={{ height: 24, minWidth: 30, padding: '0 6px', background: 'rgba(16,185,129,0.9)', border: 0, borderRight: '1px solid rgba(2,6,4,0.34)', color: '#052e1d', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 950 }}
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            title="Devolver evidencia"
                            aria-label={`Devolver ${archivo.label}`}
                            onClick={() => handleReviewEvidenceFile(sub, archivo, 'no_cumple')}
                            style={{ height: 24, minWidth: 30, padding: '0 6px', background: 'rgba(127,29,29,0.94)', border: 0, color: '#FECACA', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 950 }}
                          >
                            NO
                          </button>
                        </div>
                      )}

                      {puedeEliminarEvidencia && (
                        <button
                          type="button"
                          title="Eliminar evidencia"
                          disabled={deletingFile === (archivo.originalUrl || archivo.url)}
                          onClick={() => handleDeleteEvidenceFile(sub, archivo)}
                          style={{ position: 'absolute', top: 8, right: puedeReemplazar ? 42 : 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(127,29,29,0.9)', border: '1px solid rgba(248,113,113,0.72)', color: '#FCA5A5', cursor: deletingFile === (archivo.originalUrl || archivo.url) ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: deletingFile === (archivo.originalUrl || archivo.url) ? 0.55 : 1 }}
                        >
                          <ICONS.Trash size={12} />
                        </button>
                      )}

                      {puedeReemplazar && (
                        <button type="button" onClick={() => {
                          setReemplazarModal({
                            submissionId: sub.submissionId,
                            formId: sub.formId,
                            questionId: archivo.questionId ?? null,
                            tallyFileUrl: archivo.originalUrl || archivo.url,
                            tallyFileName: archivo.originalName || archivo.name,
                            currentName: archivo.name,
                            currentUrl: archivo.downloadUrl || archivo.url,
                          });
                          setReemplazarMotivo('');
                          setReemplazarFile(null);
                          setReemplazarFilePreview(null);
                        }} style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(15,23,42,0.85)', border: `1px solid ${C.lime}`, color: C.lime, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ICONS.Sync size={12} />
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                      <span style={{ alignSelf: 'flex-start', fontSize: '0.58rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: badgeBg, color: badgeColor, textTransform: 'uppercase' }}>{fileExt}</span>
                      <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', margin: '4px 0 2px', lineHeight: 1.3, minHeight: 42, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{archivo.label.replace(/fotografia\s*\d+\s*/i, '').replace(/[()]/g, '').trim() || archivo.label}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minHeight: 18, fontSize: '0.58rem', color: C.textMuted, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}><ICONS.Calendar size={10} /> Real {new Date(fechaMostrada).toLocaleDateString('es-CO', shortDateOptions)}</span>
                        <span style={{ flexShrink: 0 }}>|</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>Carga {new Date(sub.fechaEnvio).toLocaleDateString('es-CO', shortDateOptions)}</span>
                        <span style={{ flexShrink: 0 }}>|</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}><ICONS.Disk size={10} /> {sizeMB}</span>
                      </div>

                      {archivo.isReplaced && !correctionPending && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 24, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          <span title={`Original: ${archivo.originalName || 'evidencia anterior'}
Motivo: ${archivo.motivoReemplazo || 'Correccion cargada'}`} style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, background: correctionPending ? 'rgba(59,130,246,0.14)' : 'rgba(16, 185, 129, 0.12)', color: correctionPending ? '#93C5FD' : '#34D399', fontSize: '0.62rem', fontWeight: 700, border: `1px solid ${correctionPending ? 'rgba(96,165,250,0.28)' : 'rgba(52,211,153,0.2)'}` }}>{correctionPending ? 'Corregida' : 'Reemplazado'}</span>
                        </div>
                      )}

                      <div style={{ display: 'grid', gap: 6, marginTop: 2 }}>
                        <span style={{
                          alignSelf: 'start',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 999,
                          border: `1px solid ${reviewColors.border}`,
                          background: reviewColors.bg,
                          color: reviewColors.color,
                          fontSize: '0.6rem',
                          fontWeight: 850,
                          maxWidth: '100%',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          <span>{reviewLabel}</span>
                          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor', opacity: 0.72 }} />
                          <span style={{ opacity: 0.84 }}>{reviewHint}</span>
                        </span>
                        {observation && (
                          <div style={{ display: 'grid', gridTemplateColumns: puedeRevisarEvidencia ? '1fr auto' : '1fr', alignItems: 'center', gap: 6, margin: 0, padding: '7px 9px', borderRadius: 7, border: '1px solid rgba(248,113,113,0.24)', background: 'rgba(127,29,29,0.12)', color: '#FECACA', fontSize: '0.65rem', lineHeight: 1.35 }}>
                            <p style={{ margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              <strong>Obs:</strong> {observation}
                            </p>
                            {puedeRevisarEvidencia && (
                              <button type="button" onClick={() => handleReviewEvidenceFile(sub, archivo, 'no_cumple')} style={{ minHeight: 24, padding: '0 8px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.35)', background: 'rgba(127,29,29,0.18)', color: '#FCA5A5', fontSize: '0.58rem', fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                Editar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <a href={`/api/admin/proxy?url=${encodeURIComponent(archivo.downloadUrl || archivo.url)}&name=${encodeURIComponent(archivo.name)}`} download={archivo.name} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: archivo.syncStatus === 'synced' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: archivo.syncStatus === 'synced' ? '#34D399' : '#60A5FA', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none' }}>
                        <ICONS.Download size={13} /> Descargar
                      </a>
                      <button type="button" onClick={() => setPreview({ submissionId: sub.submissionId, url: archivo.downloadUrl || archivo.url, name: archivo.name, label: archivo.label })} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                        <ICONS.Eye size={13} /> Revisar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
