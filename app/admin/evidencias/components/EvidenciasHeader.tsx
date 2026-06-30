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
  return (
    <header style={{ background: C.filter, borderBottom: `1px solid ${C.filterBorder}`, padding: '16px 24px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        
        {/* User profile section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* User photo */}
          {session?.fotoUrl ? (
            <img 
              src={session.fotoUrl} 
              alt={session.nombre}
              style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.lime}`, boxShadow: `0 0 12px rgba(16, 185, 129, 0.2)` }}
            />
          ) : (
            <div style={{ 
              width: 44, 
              height: 44, 
              borderRadius: '50%', 
              background: `linear-gradient(135deg, #10B981 0%, #059669 100%)`, 
              color: '#06170d', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 800, 
              fontSize: '1.05rem',
              border: `1.5px solid rgba(255,255,255,0.15)`
            }}>
              {session?.nombre ? session.nombre.charAt(0).toUpperCase() : 'U'}
            </div>
          )}

          <div>
            {/* User role base */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: C.lime, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {isSuperAdmin ? 'Administrador' : isReadOnly ? 'Acceso de Consulta' : 'Panel de Coordinador'}
              </span>
              {session?.rolBase && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>•</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: C.textMuted, background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                    {session.rolBase}
                  </span>
                </>
              )}
            </div>

            <h1 style={{ fontSize: '1.15rem', fontWeight: 850, color: C.textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              {isSuperAdmin ? 'Super Administrador' : (session?.nombre ?? 'Cargando…')}
            </h1>

            {/* Active Project / Component */}
            {currentComp?.nombre && (
              <div style={{ fontSize: '0.7rem', color: C.textMuted, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: C.lime }}>📁</span>
                <span>Proyecto:</span>
                <strong style={{ color: C.textPrimary }}>{currentComp.nombre}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isSuperAdmin && (
            <Link href="/superadmin/usuarios" style={{ ...sBtn(), textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>⚙️ Configurar Permisos</Link>
          )}
          <button onClick={load} disabled={loading} style={sBtn()}>{loading ? '⟳' : '↻ Actualizar'}</button>
          <button onClick={handleLogout} style={{ ...sBtn(), color: C.errorText, borderColor: C.errorBorder }}>⎋ Cerrar sesión</button>
        </div>
      </div>
    </header>
  );
}
