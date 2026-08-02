import type React from 'react';
import { CLASES } from '@/lib/componentes';
import type { UseEvidenciasReturn } from '../hooks/useEvidencias';
import { C } from '../pageStyles';

interface ClassTabsRailProps {
  state: UseEvidenciasReturn;
  classTabsRef: React.RefObject<HTMLDivElement | null>;
  scrollClassTabs: (direction: -1 | 1) => void;
}

export function ClassTabsRail({ state, classTabsRef, scrollClassTabs }: ClassTabsRailProps) {
  const { filterClase, setFilterClase, submissions, clasesConEnvio, estadoPorClase } = state;

  return (
    <div style={{ position: 'relative', background: C.filter, borderBottom: `1px solid ${C.filterBorder}`, padding: '10px 54px', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => scrollClassTabs(-1)}
        aria-label="Ver clases anteriores"
        style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: 999, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(3,8,5,0.94)', color: C.textPrimary, fontSize: '0.95rem', fontWeight: 900, cursor: 'pointer', zIndex: 2 }}
      >
        {'<'}
      </button>
      <button
        type="button"
        onClick={() => scrollClassTabs(1)}
        aria-label="Ver mas clases"
        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: 999, border: '1px solid rgba(255,255,255,0.16)', background: C.lime, color: '#041008', fontSize: '0.95rem', fontWeight: 900, cursor: 'pointer', zIndex: 2 }}
      >
        {'>'}
      </button>
      <div
        ref={classTabsRef}
        style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', scrollBehavior: 'smooth' }}
        className="class-tabs-rail"
      >
        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: C.lime, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>Clase:</span>
        <button onClick={() => setFilterClase('')}
          style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${!filterClase ? C.lime : C.ghostBorder}`, background: !filterClase ? 'rgba(200,255,122,0.15)' : C.ghost, color: !filterClase ? C.lime : C.textMuted, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          Todas ({submissions.length})
        </button>
        {CLASES.map(c => {
          const tiene  = clasesConEnvio.has(c);
          const estado = estadoPorClase.get(c);
          const active = filterClase === c;
          const dotColor = estado === 'aprobada' ? '#4ade80' : estado === 'rechazada' ? '#f87171' : C.lime;
          const num = c.replace('Clase ', '');
          return (
            <button key={c} onClick={() => tiene && setFilterClase(active ? '' : c)}
              title={c}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: active ? 800 : 600, border: `1px solid ${active ? C.lime : tiene ? C.ghostBorder : 'rgba(255,255,255,0.06)'}`, background: active ? 'rgba(200,255,122,0.15)' : tiene ? C.ghost : 'rgba(255,255,255,0.03)', color: active ? C.lime : tiene ? C.textPrimary : 'rgba(255,255,255,0.2)', cursor: tiene ? 'pointer' : 'default', whiteSpace: 'nowrap', transition: 'all .12s', flexShrink: 0 }}>
              {num}
              {tiene && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
      <style>{`.class-tabs-rail::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
