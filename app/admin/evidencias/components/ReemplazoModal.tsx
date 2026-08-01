import React from 'react';

interface ReemplazoModalProps {
  reemplazarModal: {
    submissionId: string;
    formId: string;
    questionId: string | null;
    tallyFileUrl: string;
    tallyFileName: string | null;
    currentName: string;
    currentUrl: string;
  } | null;
  setReemplazarModal: (val: null) => void;
  reemplazarMotivo: string;
  setReemplazarMotivo: (val: string) => void;
  reemplazarError: string;
  reemplazarSaving: boolean;
  reemplazarFilePreview: string | null;
  setReemplazarFilePreview: (val: string | null) => void;
  reemplazarFile: File | null;
  setReemplazarFile: (file: File | null) => void;
  handleReemplazarSubmit: (e: React.FormEvent) => void;
  sBtn: () => React.CSSProperties;
  primaryBtn: React.CSSProperties;
  C: Record<string, string>;
}

function formatSize(bytes: number) {
  if (!bytes) return '0.0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReemplazoModal({
  reemplazarModal,
  setReemplazarModal,
  reemplazarMotivo,
  setReemplazarMotivo,
  reemplazarError,
  reemplazarSaving,
  reemplazarFilePreview,
  setReemplazarFilePreview,
  reemplazarFile,
  setReemplazarFile,
  handleReemplazarSubmit,
  sBtn,
  primaryBtn,
  C,
}: ReemplazoModalProps) {
  if (!reemplazarModal) return null;

  const handleFile = (file: File | null) => {
    setReemplazarFile(file);
    if (reemplazarFilePreview) {
      URL.revokeObjectURL(reemplazarFilePreview);
    }
    if (file && file.type.startsWith('image/')) {
      setReemplazarFilePreview(URL.createObjectURL(file));
    } else {
      setReemplazarFilePreview(null);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 16, width: '100%', maxWidth: 560, padding: 24 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: C.textPrimary, margin: '0 0 8px' }}>Reemplazar Evidencia</h2>
        <p style={{ fontSize: '0.76rem', color: C.textMuted, margin: '0 0 20px', lineHeight: 1.5 }}>
          Subirás un nuevo archivo a Cloudinary para reemplazar a: <code style={{ color: C.lime }}>{reemplazarModal.currentName}</code>.
        </p>
        <form onSubmit={handleReemplazarSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reemplazarError && (
            <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.errorText, padding: 12, borderRadius: 8, fontSize: '0.78rem' }}>
              {reemplazarError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: C.textMuted }}>Nuevo archivo de reemplazo</span>
            <label
              htmlFor="replacement-file-input"
              style={{
                minHeight: 142,
                borderRadius: 12,
                border: `1.5px dashed ${reemplazarFile ? C.lime : C.inputBorder}`,
                background: reemplazarFile ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.24)',
                color: C.textPrimary,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                padding: 18,
                textAlign: 'center',
                transition: 'border-color .15s, background .15s',
              }}
            >
              <input
                id="replacement-file-input"
                type="file"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
                accept="image/*,application/pdf"
                required
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
              />

              {reemplazarFile ? (
                <div style={{ display: 'grid', gap: 8, justifyItems: 'center', width: '100%' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: C.lime, color: '#130620', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: '1.25rem' }}>✓</div>
                  <strong style={{ fontSize: '0.9rem', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reemplazarFile.name}</strong>
                  <span style={{ fontSize: '0.72rem', color: C.textMuted }}>{reemplazarFile.type || 'Archivo'} · {formatSize(reemplazarFile.size)}</span>
                  <span style={{ fontSize: '0.72rem', color: C.lime, fontWeight: 800 }}>Clic para cambiar archivo</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', border: `1px solid ${C.surfaceBorder}`, display: 'grid', placeItems: 'center', color: C.lime, fontSize: '1.3rem' }}>↑</div>
                  <strong style={{ fontSize: '0.92rem' }}>Haz clic para cargar el nuevo archivo</strong>
                  <span style={{ fontSize: '0.72rem', color: C.textMuted }}>Imágenes o PDF · máximo 15MB</span>
                </div>
              )}
            </label>
          </div>

          {reemplazarFilePreview && (
            <div style={{ width: '100%', maxHeight: 180, overflow: 'hidden', borderRadius: 10, border: `1.5px solid ${C.surfaceBorder}`, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={reemplazarFilePreview} alt="Vista previa del reemplazo" style={{ maxHeight: 180, maxWidth: '100%', objectFit: 'contain' }} />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: C.textMuted }}>Motivo o justificación del cambio:</label>
            <textarea
              value={reemplazarMotivo}
              onChange={e => setReemplazarMotivo(e.target.value)}
              placeholder="Justifique el motivo por el cual reemplaza esta evidencia..."
              required
              style={{ width: '100%', minHeight: 80, background: 'rgba(0,0,0,0.3)', border: `1px solid ${C.inputBorder}`, borderRadius: 8, color: C.textPrimary, padding: 10, fontSize: '0.8rem', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button type="button" onClick={() => {
              if (reemplazarFilePreview) {
                URL.revokeObjectURL(reemplazarFilePreview);
              }
              setReemplazarFilePreview(null);
              setReemplazarModal(null);
            }} disabled={reemplazarSaving} style={sBtn()}>Cancelar</button>
            <button type="submit" disabled={reemplazarSaving || !reemplazarFile} style={{ ...primaryBtn, opacity: reemplazarSaving || !reemplazarFile ? 0.55 : 1 }}>
              {reemplazarSaving ? 'Subiendo...' : 'Reemplazar Evidencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
