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

export function ReemplazoModal({
  reemplazarModal,
  setReemplazarModal,
  reemplazarMotivo,
  setReemplazarMotivo,
  reemplazarError,
  reemplazarSaving,
  reemplazarFilePreview,
  setReemplazarFilePreview,
  setReemplazarFile,
  handleReemplazarSubmit,
  sBtn,
  primaryBtn,
  C,
}: ReemplazoModalProps) {
  if (!reemplazarModal) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 16, width: '100%', maxWidth: 500, padding: 24 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: C.textPrimary, margin: '0 0 8px' }}>Reemplazar Evidencia</h2>
        <p style={{ fontSize: '0.76rem', color: C.textMuted, margin: '0 0 20px' }}>
          Subirás un nuevo archivo a Cloudinary para reemplazar a: <code style={{ color: C.lime }}>{reemplazarModal.currentName}</code>.
        </p>
        <form onSubmit={handleReemplazarSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reemplazarError && (
            <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.errorText, padding: 12, borderRadius: 8, fontSize: '0.78rem' }}>
              ⚠️ {reemplazarError}
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: C.textMuted }}>Seleccione el nuevo archivo (Máx. 15MB):</label>
            <input
              type="file"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setReemplazarFile(file);
                if (reemplazarFilePreview) {
                  URL.revokeObjectURL(reemplazarFilePreview);
                }
                if (file && file.type.startsWith('image/')) {
                  setReemplazarFilePreview(URL.createObjectURL(file));
                } else {
                  setReemplazarFilePreview(null);
                }
              }}
              accept="image/*,application/pdf"
              required
              style={{ fontSize: '0.8rem', color: C.textPrimary }}
            />
          </div>

          {reemplazarFilePreview && (
            <div style={{ width: '100%', maxHeight: 150, overflow: 'hidden', borderRadius: 8, border: `1.5px solid ${C.surfaceBorder}`, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={reemplazarFilePreview} alt="Vista previa del reemplazo" style={{ maxHeight: 150, maxWidth: '100%', objectFit: 'contain' }} />
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
            <button type="submit" disabled={reemplazarSaving} style={primaryBtn}>
              {reemplazarSaving ? 'Subiendo...' : '⚡ Reemplazar Evidencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
