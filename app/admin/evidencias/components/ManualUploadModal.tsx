import React, { useEffect } from 'react';
import { SubmisionEvidencia } from '../types';
import { ICONS } from './Icons';

interface ManualUploadModalProps {
  manualUploadModal: SubmisionEvidencia | null;
  setManualUploadModal: (val: SubmisionEvidencia | null) => void;
  manualUploadLabel: string;
  setManualUploadLabel: (val: string) => void;
  manualUploadMotivo: string;
  setManualUploadMotivo: (val: string) => void;
  manualUploadFile: File | null;
  setManualUploadFile: (val: File | null) => void;
  manualUploadFilePreview: string | null;
  setManualUploadFilePreview: (val: string | null) => void;
  manualUploadError: string;
  manualUploadSaving: boolean;
  handleManualUploadSubmit: (e: React.FormEvent) => void;
  sBtn: () => React.CSSProperties;
  primaryBtn: React.CSSProperties;
  C: Record<string, string>;
}

const formatSize = (bytes: number) => {
  if (!bytes) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function ManualUploadModal({
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
  sBtn,
  primaryBtn,
  C,
}: ManualUploadModalProps) {
  useEffect(() => {
    return () => {
      if (manualUploadFilePreview) URL.revokeObjectURL(manualUploadFilePreview);
    };
  }, [manualUploadFilePreview]);

  if (!manualUploadModal) return null;

  const handleFile = (file: File | null) => {
    if (manualUploadFilePreview) URL.revokeObjectURL(manualUploadFilePreview);
    setManualUploadFile(file);
    setManualUploadFilePreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 140, padding: 20 }}>
      <form onSubmit={handleManualUploadSubmit} style={{ width: 'min(620px, 100%)', background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 14, padding: 24, boxShadow: '0 24px 70px rgba(0,0,0,0.5)' }}>
        <h2 style={{ margin: '0 0 8px', color: C.textPrimary, fontSize: '1.1rem', fontWeight: 850 }}>Agregar evidencia manual</h2>
        <p style={{ margin: '0 0 18px', color: C.textMuted, fontSize: '0.82rem', lineHeight: 1.45 }}>
          {manualUploadModal.grupo} · {manualUploadModal.clase}
        </p>

        {manualUploadError && (
          <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.errorText, padding: '10px 12px', borderRadius: 8, marginBottom: 14, fontSize: '0.8rem' }}>
            {manualUploadError}
          </div>
        )}

        <label style={{ display: 'grid', gap: 7, marginBottom: 14, color: C.textPrimary, fontSize: '0.78rem', fontWeight: 800 }}>
          Tipo de evidencia
          <input
            value={manualUploadLabel}
            onChange={(e) => setManualUploadLabel(e.target.value)}
            placeholder="Lista de asistencia"
            style={{ minHeight: 40, borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: C.input, color: C.textPrimary, padding: '0 12px', outline: 'none' }}
          />
        </label>

        <label htmlFor="manual-evidence-file" style={{ display: 'grid', placeItems: 'center', gap: 8, minHeight: 140, borderRadius: 10, border: `1.5px dashed ${manualUploadFile ? C.lime : C.inputBorder}`, background: manualUploadFile ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.22)', color: C.textMuted, cursor: 'pointer', marginBottom: 14, padding: 16, textAlign: 'center' }}>
          <ICONS.UploadArrow size={28} />
          {manualUploadFile ? (
            <>
              <strong style={{ color: C.textPrimary, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{manualUploadFile.name}</strong>
              <span style={{ fontSize: '0.72rem' }}>{manualUploadFile.type || 'Archivo'} · {formatSize(manualUploadFile.size)}</span>
            </>
          ) : (
            <span>Seleccionar archivo manual (max. 15MB)</span>
          )}
          <input
            id="manual-evidence-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
            style={{ display: 'none' }}
          />
        </label>

        {manualUploadFilePreview && (
          <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.inputBorder}`, background: 'rgba(0,0,0,0.24)', display: 'grid', placeItems: 'center', padding: 8 }}>
            <img src={manualUploadFilePreview} alt="Vista previa" style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain' }} />
          </div>
        )}

        <label style={{ display: 'grid', gap: 7, marginBottom: 18, color: C.textPrimary, fontSize: '0.78rem', fontWeight: 800 }}>
          Nota interna
          <textarea
            value={manualUploadMotivo}
            onChange={(e) => setManualUploadMotivo(e.target.value)}
            placeholder="Ej: lista cargada manualmente por soporte"
            style={{ minHeight: 78, borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: C.input, color: C.textPrimary, padding: 12, outline: 'none', resize: 'vertical' }}
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" disabled={manualUploadSaving} onClick={() => {
            if (manualUploadFilePreview) URL.revokeObjectURL(manualUploadFilePreview);
            setManualUploadFilePreview(null);
            setManualUploadFile(null);
            setManualUploadModal(null);
          }} style={sBtn()}>Cancelar</button>
          <button type="submit" disabled={manualUploadSaving || !manualUploadFile || !manualUploadLabel.trim()} style={{ ...primaryBtn, opacity: manualUploadSaving || !manualUploadFile || !manualUploadLabel.trim() ? 0.55 : 1 }}>
            {manualUploadSaving ? 'Subiendo...' : 'Agregar evidencia'}
          </button>
        </div>
      </form>
    </div>
  );
}
