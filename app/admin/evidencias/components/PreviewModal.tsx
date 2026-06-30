import React from 'react';
import { Preview } from '../types';

interface PreviewModalProps {
  preview: Preview | null;
  setPreview: (val: null) => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  pan: { x: number; y: number };
  dragging: boolean;
  onWheel: (e: React.WheelEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  ICONS: Record<string, React.ComponentType<{ size?: number; filled?: boolean }>>;
  C: Record<string, string>;
}

export function PreviewModal({
  preview,
  setPreview,
  zoom,
  setZoom,
  pan,
  dragging,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  ICONS,
  C,
}: PreviewModalProps) {
  if (!preview) return null;

  const isPdf = preview.url.toLowerCase().endsWith('.pdf') || preview.name.toLowerCase().endsWith('.pdf');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.94)', zIndex: 90, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <div>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: C.lime, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{preview.label}</span>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', margin: '2px 0 0' }}>{preview.name}</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!isPdf && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 10px', fontSize: '0.78rem', color: C.textMuted }}>
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>−</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(8, z + 0.25))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
              <button onClick={() => { setZoom(1); }} style={{ background: 'none', border: 'none', color: C.lime, cursor: 'pointer', fontSize: '0.72rem', marginLeft: 4 }}>Reset</button>
            </div>
          )}
          <a href={preview.url} download style={{ background: C.lime, color: '#000', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ICONS.Download size={11} /> Descargar
          </a>
          <button onClick={() => setPreview(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', width: 28, height: 28, borderRadius: 6, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ICONS.Close size={14} />
          </button>
        </div>
      </div>

      {/* Main viewer area */}
      <div 
        style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isPdf ? 'default' : dragging ? 'grabbing' : 'grab' }}
        onWheel={isPdf ? undefined : onWheel}
        onMouseDown={isPdf ? undefined : onMouseDown}
        onMouseMove={isPdf ? undefined : onMouseMove}
        onMouseUp={isPdf ? undefined : onMouseUp}
        onMouseLeave={isPdf ? undefined : onMouseUp}
      >
        {isPdf ? (
          <iframe 
            src={preview.url} 
            title={preview.name} 
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : (
          <img 
            src={preview.url} 
            alt={preview.name} 
            style={{
              maxHeight: '90vh',
              maxWidth: '90vw',
              objectFit: 'contain',
              userSelect: 'none',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: dragging ? 'none' : 'transform 0.15s ease-out',
            }}
          />
        )}
      </div>
    </div>
  );
}
