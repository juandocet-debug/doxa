import { C, primaryBtn } from '../pageStyles';

interface DriveResultModalProps {
  result: { success: boolean; message: string } | null;
  onClose: () => void;
}

export function DriveResultModal({ result, onClose }: DriveResultModalProps) {
  if (!result) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.surfaceBorder}`, padding: 24, borderRadius: 12, maxWidth: 400, textAlign: 'center' }}>
        <h3 style={{ color: result.success ? '#10B981' : '#F87171', margin: '0 0 12px', fontWeight: 800 }}>
          {result.success ? '✓ Copia Creada' : '⚠️ No se pudo subir'}
        </h3>
        <p style={{ color: C.textPrimary, fontSize: '0.85rem', margin: '0 0 20px', lineHeight: 1.4 }}>
          {result.message}
        </p>
        <button onClick={onClose} style={primaryBtn}>Entendido</button>
      </div>
    </div>
  );
}
