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

const optionStyle: React.CSSProperties = {
  background: '#07110b',
  color: '#ecfdf5',
};

function selectStyle(C: Record<string, string>, minWidth = 240): React.CSSProperties {
  return {
    background: C.input,
    border: `1px solid ${C.inputBorder}`,
    borderRadius: 8,
    color: C.textPrimary,
    padding: '0 12px',
    minHeight: 38,
    fontSize: '0.82rem',
    outline: 'none',
    minWidth,
    maxWidth: 360,
    colorScheme: 'dark'
  };
}

function FieldLabel({ children, C }: { children: React.ReactNode; C: Record<string, string> }) {
  return (
    <span style={{ fontSize: '0.68rem', fontWeight: 850, color: C.lime, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}
    </span>
  );
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
  const visibleComponentes = COMPONENTES.filter(c =>
    isSuperAdmin || session?.permisos?.some((p: SessionPermiso) => p.componenteId === c.id && p.puedeVer)
  );

  return (
    <div style={{ background: C.filter, borderBottom: `1px solid ${C.filterBorder}`, padding: '10px 24px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'end', gap: 14, flexWrap: 'wrap' }}>
        {visibleComponentes.length > 1 && (
          <label style={{ display: 'grid', gap: 5 }}>
            <FieldLabel C={C}>Componente</FieldLabel>
            <select
              value={selectedCompId}
              onChange={e => {
                setSelectedCompId(e.target.value);
                setFilterGrupo('');
              }}
              style={selectStyle(C, 280)}
            >
              {visibleComponentes.map(c => (
                <option key={c.id} value={c.id} style={optionStyle}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
        )}

        <label style={{ display: 'grid', gap: 5 }}>
          <FieldLabel C={C}>Grupo</FieldLabel>
          <select
            value={filterGrupo}
            onChange={e => setFilterGrupo(e.target.value)}
            style={selectStyle(C, 260)}
          >
            <option value="" style={optionStyle}>Todos los grupos</option>
            {(currentComp?.grupos ?? []).map(g => (
              <option key={g} value={g} style={optionStyle}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 5 }}>
          <FieldLabel C={C}>Desde</FieldLabel>
          <input
            type="date"
            value={filterDesde}
            onChange={e => setFilterDesde(e.target.value)}
            style={{ background: C.input, border: `1px solid ${C.inputBorder}`, borderRadius: 8, color: C.textPrimary, padding: '0 10px', minHeight: 38, fontSize: '0.82rem', outline: 'none', colorScheme: 'dark' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 5 }}>
          <FieldLabel C={C}>Hasta</FieldLabel>
          <input
            type="date"
            value={filterHasta}
            onChange={e => setFilterHasta(e.target.value)}
            style={{ background: C.input, border: `1px solid ${C.inputBorder}`, borderRadius: 8, color: C.textPrimary, padding: '0 10px', minHeight: 38, fontSize: '0.82rem', outline: 'none', colorScheme: 'dark' }}
          />
        </label>

        {(filterDesde || filterHasta) && (
          <button onClick={() => { setFilterDesde(''); setFilterHasta(''); }} style={{ ...sBtn(), fontSize: '0.75rem', padding: '0 10px', minHeight: 30 }}>
            Limpiar fechas
          </button>
        )}

        <span style={{ fontSize: '0.74rem', color: C.textMuted, marginLeft: 'auto', paddingBottom: 9 }}>
          {submissions.length} envio{submissions.length !== 1 ? 's' : ''} · {clasesConEnvio.size} clase{clasesConEnvio.size !== 1 ? 's' : ''} con evidencias
        </span>
      </div>
    </div>
  );
}
