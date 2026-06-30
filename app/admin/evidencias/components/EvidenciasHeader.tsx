import React from 'react';
import Link from 'next/link';
import { SessionComp } from '../types';

interface EvidenciasHeaderProps {
  session: SessionComp | null;
  isSuperAdmin: boolean;
  isReadOnly: boolean;
  currentComp: { id: string; nombre: string; formId: string } | null;
  loading: boolean;
  load: () => void;
  handleLogout: () => void;
  sBtn: (active?: boolean) => React.CSSProperties;
  C: Record<string, string>;
}

export function EvidenciasHeader({
  session,
  isSuperAdmin,
  isReadOnly,
  currentComp,
  loading,
  load,
  handleLogout,
  sBtn,
  C,
}: EvidenciasHeaderProps) {
  const roleLabel = isSuperAdmin ? 'Administrador' : isReadOnly ? 'Acceso de Consulta' : 'Panel de Coordinador';

  return (
    <header style={{ background: C.filter, borderBottom: `1px solid ${C.filterBorder}`, padding: '14px 24px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: '1 1 520px' }}>
          {session?.fotoUrl ? (
            <img
              src={session.fotoUrl}
              alt={session.nombre}
              style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.lime}`, boxShadow: '0 0 12px rgba(16,185,129,0.25)', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981 0%, #064e3b 100%)',
              color: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 850,
              fontSize: '1.05rem',
              border: '1.5px solid rgba(255,255,255,0.15)',
              flexShrink: 0
            }}>
              {session?.nombre ? session.nombre.charAt(0).toUpperCase() : 'U'}
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.64rem', fontWeight: 900, color: C.lime, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                {roleLabel}
              </span>
              {session?.rolBase && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.72rem' }}>•</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: C.textMuted, background: 'rgba(255,255,255,0.07)', padding: '3px 7px', borderRadius: 5 }}>
                    {session.rolBase}
                  </span>
                </>
              )}
            </div>

            <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: C.textPrimary, margin: 0, lineHeight: 1.08 }}>
              {isSuperAdmin ? 'Super Administrador' : (session?.nombre ?? 'Cargando...')}
            </h1>

            {currentComp?.nombre && (
              <div style={{ marginTop: 7, display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', columnGap: 8, rowGap: 2, alignItems: 'start', maxWidth: 900 }}>
                <span style={{ color: C.lime, fontSize: '0.84rem', lineHeight: 1.35 }} aria-hidden="true">▣</span>
                <div style={{ minWidth: 0 }}>
                  <span style={{ color: C.textMuted, fontSize: '0.8rem', marginRight: 6 }}>Componente:</span>
                  <strong style={{ color: C.textPrimary, fontSize: '0.82rem', lineHeight: 1.35, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {currentComp.nombre}
                  </strong>
                  <span style={{ color: C.textMuted, fontSize: '0.72rem', marginLeft: 8 }}>
                    Formulario {currentComp.formId}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {isSuperAdmin && (
            <Link href="/superadmin/usuarios" style={{ ...sBtn(), textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              ⚙ Configurar Permisos
            </Link>
          )}
          <button onClick={load} disabled={loading} style={sBtn()}>
            {loading ? '...' : '↻ Actualizar'}
          </button>
          <button onClick={handleLogout} style={{ ...sBtn(), color: C.errorText, borderColor: C.errorBorder }}>
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
