import React, { useEffect, useRef } from 'react';
import { RevisionModalState } from '../types';

const MAX_OBSERVACION_WORDS = 20;

function splitWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean);
}

function limitWords(value: string) {
  return splitWords(value).slice(0, MAX_OBSERVACION_WORDS).join(' ');
}

interface RevisionModalProps {
  modal: RevisionModalState | null;
  setModal: (value: RevisionModalState | null) => void;
  observacion: string;
  setObservacion: (value: string) => void;
  saving: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  C: Record<string, string>;
}

export function RevisionModal({ modal, setModal, observacion, setObservacion, saving, error, onSubmit, C }: RevisionModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) setModal(null);
    };
    document.addEventListener('keydown', onKeyDown);
    if (modal.estadoRevision === 'no_cumple') textareaRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modal, saving, setModal]);

  if (!modal) return null;
  const noCumple = modal.estadoRevision === 'no_cumple';
  const wordCount = splitWords(observacion).length;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="revision-title" style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(6px)' }} onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setModal(null); }}>
      <form onSubmit={onSubmit} style={{ width: '100%', maxWidth: 520, padding: 24, borderRadius: 16, border: `1px solid ${noCumple ? 'rgba(248,113,113,.35)' : C.surfaceBorder}`, background: C.surface, boxShadow: '0 24px 70px rgba(0,0,0,.45)' }}>
        <span style={{ display: 'inline-flex', padding: '4px 9px', borderRadius: 999, background: noCumple ? 'rgba(127,29,29,.24)' : 'rgba(16,185,129,.14)', color: noCumple ? '#FCA5A5' : '#A7F3D0', fontSize: '.68rem', fontWeight: 900 }}>{noCumple ? 'DEVOLVER EVIDENCIA' : 'APROBAR EVIDENCIA'}</span>
        <h2 id="revision-title" style={{ margin: '12px 0 6px', color: C.textPrimary, fontSize: '1.15rem' }}>{noCumple ? 'Que debe corregirse?' : 'La evidencia cumple?'}</h2>
        <p style={{ margin: '0 0 18px', color: C.textMuted, fontSize: '.8rem', lineHeight: 1.5 }}><strong style={{ color: C.textPrimary }}>{modal.archivo.label}</strong></p>

        {noCumple ? (
          <label style={{ display: 'grid', gap: 7, color: C.textMuted, fontSize: '.75rem', fontWeight: 800 }}>
            Observacion breve para corregir <span style={{ color: '#FCA5A5' }}>*</span>
            <textarea ref={textareaRef} value={observacion} onChange={(e) => setObservacion(limitWords(e.target.value))} required placeholder="Ej: Falta evidencia clara del cierre de la actividad" style={{ minHeight: 92, resize: 'vertical', borderRadius: 9, border: `1px solid ${error ? 'rgba(248,113,113,.65)' : C.inputBorder}`, background: C.input, color: C.textPrimary, padding: 12, font: 'inherit', outline: 'none' }} />
            <span style={{ justifySelf: 'end', fontSize: '.68rem', fontWeight: 600 }}>{wordCount}/{MAX_OBSERVACION_WORDS} palabras</span>
          </label>
        ) : (
          <div style={{ padding: 12, borderRadius: 9, border: '1px solid rgba(16,185,129,.24)', background: 'rgba(16,185,129,.08)', color: '#D1FAE5', fontSize: '.78rem', lineHeight: 1.5 }}>Se marcara este archivo como <strong>Cumple</strong>. Si fue corregido, quedara aprobado desde esta revision.</div>
        )}

        {error && <p role="alert" style={{ margin: '12px 0 0', color: '#FCA5A5', fontSize: '.76rem' }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" disabled={saving} onClick={() => setModal(null)} style={{ minHeight: 38, padding: '0 14px', borderRadius: 8, border: `1px solid ${C.ghostBorder}`, background: C.ghost, color: C.textPrimary, fontWeight: 800, cursor: saving ? 'default' : 'pointer' }}>Cancelar</button>
          <button type="submit" disabled={saving || (noCumple && !observacion.trim())} style={{ minHeight: 38, padding: '0 16px', border: 0, borderRadius: 8, background: noCumple ? '#DC2626' : C.lime, color: noCumple ? '#fff' : '#041008', fontWeight: 900, opacity: saving || (noCumple && !observacion.trim()) ? .55 : 1, cursor: saving ? 'wait' : 'pointer' }}>{saving ? 'Guardando...' : noCumple ? 'Marcar no cumple' : 'Aprobar'}</button>
        </div>
      </form>
    </div>
  );
}
