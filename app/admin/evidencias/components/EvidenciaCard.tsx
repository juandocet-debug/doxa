import React from 'react';
import { SubmisionEvidencia, Preview } from '../types';
import { ICONS } from './Icons';

interface FolderCardProps {
  sub: SubmisionEvidencia;
  puedeAprobar: boolean;
  handleDeleteClass: (clase: string) => void;
  setFilterClase: (clase: string) => void;
  zipName: string;
  C: Record<string, string>;
}

export function FolderCard({
  sub,
  puedeAprobar,
  handleDeleteClass,
  setFilterClase,
  zipName,
  C,
}: FolderCardProps) {
  const totalFotos  = sub.fotos.reduce((a, f) => a + f.archivos.length, 0);
  const estadoColor = sub.estado === 'aprobada' ? '#4ade80' : sub.estado === 'rechazada' ? '#f87171' : '#fbbf24';
  const estadoLabel = sub.estado === 'aprobada' ? 'Aprobada' : sub.estado === 'rechazada' ? 'Rechazada' : 'Pendiente';
  const thumbs      = sub.fotos.flatMap(g => g.archivos).filter(a => a.mimeType?.startsWith('image/')).slice(0, 4);

  // Folder colors by state
  const folderTab  = sub.estado === 'aprobada' ? '#3a8f5a' : sub.estado === 'rechazada' ? '#8f3a3a' : '#3a5a8f';
  const folderBody = sub.estado === 'aprobada'
    ? 'linear-gradient(160deg,#1a4a30 0%,#0f2e1c 100%)'
    : sub.estado === 'rechazada'
    ? 'linear-gradient(160deg,#4a1a1a 0%,#2e0f0f 100%)'
    : 'linear-gradient(160deg,#1e3a6e 0%,#0f1f3c 100%)';

  return (
    <div className="folder-card" style={{ position: 'relative', paddingTop: 20, cursor: 'pointer' }} onClick={() => setFilterClase(sub.clase)}>
      {puedeAprobar && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClass(sub.clase);
          }}
          title="Eliminar todos los datos de esta clase"
          style={{
            position: 'absolute', top: 30, right: 10,
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#F87171', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s', zIndex: 10
          }}
        >
          <ICONS.Trash size={12} />
        </button>
      )}

      {/* Folder Tab */}
      <div style={{
        position: 'absolute', top: 0, left: 18,
        width: 90, height: 22,
        background: folderTab,
        borderRadius: '10px 10px 0 0',
        zIndex: 1,
      }} />

      {/* Folder Body */}
      <div style={{
        background: folderBody,
        borderRadius: '0 12px 12px 12px',
        border: `1px solid rgba(255,255,255,0.1)`,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        transition: 'transform .12s, box-shadow .12s',
      }}>
        {/* Thumbnails grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: 130, gap: 2, padding: 12, paddingBottom: 8 }}>
          {thumbs.length > 0
            ? thumbs.map((f, i) => (
              <img key={i} src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6, display: 'block' }} />
            ))
            : (
              <div style={{ gridColumn: '1/-1', gridRow: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', opacity: 0.4 }}>
                📂
              </div>
            )
          }
          {thumbs.length > 0 && thumbs.length < 4 && Array.from({ length: 4 - thumbs.length }).map((_, i) => (
            <div key={`empty-${i}`} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} />
          ))}
        </div>

        {/* Folder Info */}
        <div style={{ padding: '8px 14px 12px' }}>
          <p style={{ margin: '0 0 2px', fontSize: '1.05rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            {sub.clase}
          </p>
          <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {totalFotos} archivo{totalFotos !== 1 ? 's' : ''}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', fontWeight: 700, color: estadoColor }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: estadoColor, flexShrink: 0 }} />
              {estadoLabel}
            </span>
            <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.28)' }}>
              {new Date(sub.fechaEnvio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
            </span>
          </div>

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
}

interface DetailCardProps {
  sub: SubmisionEvidencia;
  puedeExportar: boolean;
  puedeSincronizarBackup: boolean;
  puedeAprobar: boolean;
  puedeReemplazar: boolean;
  uploadingDrive: string | null;
  syncingBackup: string | null;
  preview: Preview | null;
  setPreview: (val: Preview | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setReemplazarModal: (val: any) => void;
  setReemplazarMotivo: (val: string) => void;
  setReemplazarFile: (val: File | null) => void;
  setReemplazarError: (val: string) => void;
  setReemplazarFilePreview: (val: string | null) => void;
  handleUploadToDrive: (sub: SubmisionEvidencia) => void;
  handleSyncBackup: (sub: { formId: string; submissionId: string }) => void;
  handleDeleteSubmission: (submissionId: string) => void;
  setFilterClase: (val: string) => void;
  sBtn: () => React.CSSProperties;
  zipName: string;
  C: Record<string, string>;
}

export function DetailCard({
  sub,
  puedeExportar,
  puedeSincronizarBackup,
  puedeAprobar,
  puedeReemplazar,
  uploadingDrive,
  syncingBackup,
  preview,
  setPreview,
  setReemplazarModal,
  setReemplazarMotivo,
  setReemplazarFile,
  setReemplazarError,
  setReemplazarFilePreview,
  handleUploadToDrive,
  handleSyncBackup,
  handleDeleteSubmission,
  setFilterClase,
  sBtn,
  zipName,
  C,
}: DetailCardProps) {
  const totalArchivos  = sub.fotos.reduce((a, f) => a + f.archivos.length, 0);
  const todasFotos = sub.fotos.flatMap(g => g.archivos.map(a => ({ ...a, label: g.label })));

  return (
    <div style={{ background: 'rgba(10,18,30,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 80px rgba(0,0,0,0.65)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ICONS.Folder />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>{sub.clase}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontSize: '0.72rem', color: C.textMuted }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ICONS.Calendar size={12} /> {new Date(sub.fechaEnvio).toLocaleString('es-CO')}</span>
              <span>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ICONS.File size={12} /> {totalArchivos} archivos</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, border: '1px solid #10B981', background: 'rgba(16,185,129,0.06)', color: '#10B981', fontSize: '0.72rem', fontWeight: 700 }}>
            <ICONS.Shield size={13} filled={true} /> Estado del respaldo
          </div>

          {puedeExportar && (
            <>
              <a href={`/api/admin/zip?formId=${sub.formId}&submissionId=${sub.submissionId}&zipName=${encodeURIComponent(zipName)}`} download={`${zipName}.zip`} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'0 14px', minHeight:34, borderRadius:8, background: C.lime, color: '#130620', fontWeight: 850, fontSize: '0.75rem', textDecoration: 'none' }}>
                <ICONS.Zip size={13} /> ZIP
              </a>
              <button onClick={() => handleUploadToDrive(sub)} disabled={uploadingDrive === sub.submissionId} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'0 14px', minHeight:34, borderRadius:8, border:'none', background: '#10B981', color:'#130620', fontWeight:850, fontSize:'0.75rem', cursor: 'pointer', opacity: uploadingDrive === sub.submissionId ? 0.6 : 1 }}>
                <ICONS.Cloud size={13} /> Drive
              </button>
            </>
          )}

          {puedeSincronizarBackup && (
            <button onClick={() => handleSyncBackup(sub)} disabled={syncingBackup === sub.submissionId} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'0 14px', minHeight:34, borderRadius:8, background: 'rgba(59,130,246,0.15)', border: '1px solid #3B82F6', color:'#3B82F6', fontWeight:850, fontSize:'0.75rem', cursor: 'pointer', opacity: syncingBackup === sub.submissionId ? 0.6 : 1 }}>
              <ICONS.Sync size={13} /> Sincronizar
            </button>
          )}

          {puedeAprobar && (
            <button onClick={() => handleDeleteSubmission(sub.submissionId)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', minHeight: 34, borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444', color: '#F87171', fontWeight: 850, fontSize: '0.75rem', cursor: 'pointer' }}>
              <ICONS.Trash size={13} /> Eliminar
            </button>
          )}

          <button onClick={() => setFilterClase('')} style={{ ...sBtn(), minHeight: 34, fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ICONS.Back size={13} /> Volver
          </button>
        </div>
      </div>

      {sub.notas && (
        <div style={{ background: 'rgba(216,200,246,0.06)', border: '1px solid rgba(216,200,246,0.12)', borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem', color: '#D8C8F6', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ICONS.Note size={14} /> <strong>Observación:</strong> {sub.notas}
        </div>
      )}

      {/* Grid of files inside submission */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 20, marginTop: 10 }}>
        {todasFotos.map((archivo, ai) => {
          const isSelected = preview?.url === archivo.url;
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

          return (
            <div key={ai} style={{ background: 'rgba(13,20,30,0.45)', border: isSelected ? `1.5px solid ${C.lime}` : '1.5px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
              <div style={{ position: 'relative', width: '100%', height: 140, borderRadius: 8, overflow: 'hidden', background: C.input, border: '1px solid rgba(255,255,255,0.04)' }}>
                <button onClick={() => setPreview({ submissionId: sub.submissionId, url: archivo.url, name: archivo.name, label: archivo.label })} style={{ width: '100%', height: '100%', cursor: 'pointer', padding: 0, background: 'none', border: 'none', display: 'block', outline: 'none' }}>
                  {archivo.mimeType?.startsWith('image/') ? (
                    <img src={archivo.url} alt={archivo.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted }}>
                      <ICONS.File size={40} />
                    </div>
                  )}
                </button>

                {(archivo.syncStatus === 'synced' || archivo.isReplaced) && (
                  <div style={{ position: 'absolute', top: 8, left: 8, width: 22, height: 22, borderRadius: '50%', background: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>✓</div>
                )}

                {puedeReemplazar && (
                  <button onClick={() => {
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
                  }} style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(15,23,42,0.85)', border: `1px solid ${C.lime}`, color: C.lime, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ICONS.Sync size={12} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span style={{ alignSelf: 'flex-start', fontSize: '0.58rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: badgeBg, color: badgeColor, textTransform: 'uppercase' }}>{fileExt}</span>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', margin: '4px 0 2px', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{archivo.label.replace(/fotografía\s*\d+\s*/i, '').replace(/[()]/g, '').trim() || archivo.label}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.66rem', color: C.textMuted }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><ICONS.Calendar size={11} /> {new Date(sub.fechaEnvio).toLocaleDateString()}</span>
                  <span>|</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><ICONS.Disk size={11} /> {sizeMB}</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {archivo.isReplaced && (
                    <span title={`Original: ${archivo.originalName}\nMotivo: ${archivo.motivoReemplazo}`} style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.12)', color: '#34D399', fontSize: '0.62rem', fontWeight: 700, border: '1px solid rgba(52,211,153,0.2)' }}>✓ Reemplazado</span>
                  )}
                  {archivo.syncStatus === 'synced' ? (
                    <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#60A5FA', fontSize: '0.62rem', fontWeight: 700, border: '1px solid rgba(96,165,250,0.2)', alignItems: 'center', gap: 4 }}>
                      <ICONS.Cloud size={11} /> Respaldado
                    </span>
                  ) : archivo.syncStatus === 'failed' ? (
                    <span title={archivo.syncError || 'Error'} style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#F87171', fontSize: '0.62rem', fontWeight: 700, border: '1px solid rgba(248,113,113,0.2)', alignItems: 'center', gap: 4 }}>
                      <ICONS.Shield size={11} /> Falla backup
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: '#FBBF24', fontSize: '0.62rem', fontWeight: 700, border: '1px solid rgba(251,191,36,0.2)', alignItems: 'center', gap: 4 }}>
                      <ICONS.Hourglass size={11} /> Backup pend.
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <a href={`/api/admin/proxy?url=${encodeURIComponent(archivo.url)}&name=${encodeURIComponent(archivo.name)}`} download={archivo.name} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: archivo.syncStatus === 'synced' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: archivo.syncStatus === 'synced' ? '#34D399' : '#60A5FA', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none' }}>
                  <ICONS.Download size={13} /> Descargar
                </a>
                <button onClick={() => setPreview({ submissionId: sub.submissionId, url: archivo.url, name: archivo.name, label: archivo.label })} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                  <ICONS.Eye size={13} /> Revisar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
