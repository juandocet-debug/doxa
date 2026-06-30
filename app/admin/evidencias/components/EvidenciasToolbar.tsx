import React from 'react';
import { SessionComp, SessionPermiso, SubmisionEvidencia } from '../types';

interface EvidenciasToolbarProps {
  selectedCompId: string;
  setSelectedCompId: (id: string) => void;
  filterGrupo: string;
  setFilterGrupo: (g: string) => void;
  filterDesde: string;
  setFilterDesde: (d: string) => void;
  filterHasta: string;
  setFilterHasta: (h: string) => void;
  submissions: SubmisionEvidencia[];
  clasesConEnvio: Set<string>;
  currentComp: { id: string; nombre: string; formId: string; grupos: string[] } | null;
  isSuperAdmin: boolean;
  session: SessionComp | null;
  sBtn: (active?: boolean) => React.CSSProperties;
  C: Record<string, string>;
  COMPONENTES: { id: string; nombre: string; formId: string; grupos: string[] }[];
}

export function EvidenciasToolbar({
  selectedCompId,
  setSelectedCompId,
  filterGrupo,
  setFilterGrupo,
  filterDesde,
  setFilterDesde,
  filterHasta,
  setFilterHasta,
  submissions,
  clasesConEnvio,
  currentComp,
  isSuperAdmin,
  session,
  sBtn,
  C,
  COMPONENTES,
}: EvidenciasToolbarProps) {
  return (
    <div style={{ background: C.filter, borderBottom: `1px solid ${C.filterBorder}`, padding: '9px 24px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {(() => {
          const visibleComponentes = COMPONENTES.filter(c =>
            isSuperAdmin || session?.permisos?.some((p: SessionPermiso) => p.componenteId === c.id && p.puedeVer)
          );
          if (visibleComponentes.length > 1) {
            return (
              <select value={selectedCompId} onChange={e => { setSelectedCompId(e.target.value); setFilterGrupo(''); }}
                style={{ background: C.input, border: `1px solid ${C.inputBorder}`, borderRadius: 8, color: C.textPrimary, padding: '0 12px', minHeight: 36, fontSize: '0.82rem', outline: 'none', minWidth: 220, maxWidth: 300 }}>
                {visibleComponentes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            );
          }
          return null;
        })()}
        <select value={filterGrupo} onChange={e => setFilterGrupo(e.target.value)}
          style={{ background: C.input, border: `1px solid ${C.inputBorder}`, borderRadius: 8, color: C.textPrimary, padding: '0 12px', minHeight: 36, fontSize: '0.82rem', outline: 'none', minWidth: 220, maxWidth: 300 }}>
          <option value="">— Todos los grupos —</option>
          {(currentComp?.grupos ?? []).map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.74rem', color: C.textMuted }}>Desde:</span>
          <input type="date" value={filterDesde} onChange={e => setFilterDesde(e.target.value)}
            style={{ background: C.input, border: `1px solid ${C.inputBorder}`, borderRadius: 8, color: C.textPrimary, padding: '0 10px', minHeight: 36, fontSize: '0.82rem', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.74rem', color: C.textMuted }}>Hasta:</span>
          <input type="date" value={filterHasta} onChange={e => setFilterHasta(e.target.value)}
            style={{ background: C.input, border: `1px solid ${C.inputBorder}`, borderRadius: 8, color: C.textPrimary, padding: '0 10px', minHeight: 36, fontSize: '0.82rem', outline: 'none' }} />
        </div>
        {(filterDesde || filterHasta) && (
          <button onClick={() => { setFilterDesde(''); setFilterHasta(''); }} style={{ ...sBtn(), fontSize: '0.75rem', padding: '0 10px', minHeight: 28 }}>
            ✕ Limpiar Fechas
          </button>
        )}
        <span style={{ fontSize: '0.74rem', color: C.textMuted }}>
          {submissions.length} envío{submissions.length !== 1 ? 's' : ''} · {clasesConEnvio.size} clase{clasesConEnvio.size !== 1 ? 's' : ''} con evidencias
        </span>
      </div>
    </div>
  );
}
