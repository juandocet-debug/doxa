import React from 'react';

interface NotasModalProps {
  notasModal: { id: string; formId: string } | null;
  setNotasModal: (val: null) => void;
  notasText: string;
  setNotasText: (val: string) => void;
  approving: string | null;
  handleSaveNotas: () => void;
  sBtn: () => React.CSSProperties;
  primaryBtn: React.CSSProperties;
  C: Record<string, string>;
}

export function NotasModal({
  notasModal,
  setNotasModal,
  notasText,
  setNotasText,
  approving,
  handleSaveNotas,
  sBtn,
  primaryBtn,
  C,
}: NotasModalProps) {
  if (!notasModal) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 16, width: '100%', maxWidth: 500, padding: 24 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: C.textPrimary, margin: '0 0 16px' }}>Editar Notas / Observaciones</h2>
        <textarea
          value={notasText}
          onChange={e => setNotasText(e.target.value)}
          placeholder="Escribe aquí las observaciones sobre esta entrega de evidencias..."
          style={{ width: '100%', minHeight: 140, background: 'rgba(0,0,0,0.3)', border: `1px solid ${C.inputBorder}`, borderRadius: 8, color: C.textPrimary, padding: 12, fontSize: '0.85rem', outline: 'none', resize: 'vertical', marginBottom: 20 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={() => setNotasModal(null)} disabled={!!approving} style={sBtn()}>Cancelar</button>
          <button onClick={handleSaveNotas} disabled={!!approving} style={primaryBtn}>{approving ? 'Guardando...' : '💾 Guardar Nota'}</button>
        </div>
      </div>
    </div>
  );
}
