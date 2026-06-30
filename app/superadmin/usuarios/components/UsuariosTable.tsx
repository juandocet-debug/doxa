import React from 'react';

export interface Permiso {
  componenteId: string;
  puedeVer: boolean;
  puedeAprobar: boolean;
  puedeDevolver: boolean;
  puedeReemplazar: boolean;
  puedeSincronizarBackup: boolean;
  puedeExportar: boolean;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string | null;
  documento: string | null;
  rolBase: string | null;
  activo: boolean;
  lastSyncedAt: string | null;
  permisos: Permiso[];
}

interface UsuariosTableProps {
  usuarios: Usuario[];
  loading: boolean;
  expandedUserId: string | null;
  setExpandedUserId: (id: string | null) => void;
  updatingUserId: string | null;
  onActivoToggle: (usuario: Usuario) => void;
  onPermissionChange: (
    usuario: Usuario,
    componenteId: string,
    key: keyof Omit<Permiso, 'componenteId'>,
    value: boolean
  ) => void;
  C: {
    surfaceBorder: string;
    textMuted: string;
    textPrimary: string;
    accent: string;
    dangerBg: string;
    dangerBorder: string;
    dangerText: string;
  };
  componentesEstaticos: { id: string; nombre: string }[];
}

export function UsuariosTable({
  usuarios,
  loading,
  expandedUserId,
  setExpandedUserId,
  updatingUserId,
  onActivoToggle,
  onPermissionChange,
  C,
  componentesEstaticos,
}: UsuariosTableProps) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted }}>
        Cargando lista de usuarios…
      </div>
    );
  }

  if (usuarios.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted }}>
        No se encontraron usuarios.
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
        padding: '16px 24px',
        background: 'rgba(0,0,0,0.2)',
        borderBottom: `1px solid ${C.surfaceBorder}`,
        fontSize: '0.8rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        color: C.textMuted,
        letterSpacing: '0.05em'
      }}>
        <div>Usuario</div>
        <div>Documento</div>
        <div>Rol Base</div>
        <div style={{ textAlign: 'center' }}>Estado</div>
        <div style={{ textAlign: 'right' }}>Acciones</div>
      </div>

      {usuarios.map(usuario => {
        const isExpanded = expandedUserId === usuario.id;
        const isUpdating = updatingUserId === usuario.id;

        return (
          <div key={usuario.id} style={{ borderBottom: `1px solid ${C.surfaceBorder}`, transition: 'all 0.15s' }}>
            
            {/* User Summary Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
              padding: '20px 24px',
              alignItems: 'center',
              background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: C.textPrimary }}>{usuario.nombre}</div>
                <div style={{ fontSize: '0.75rem', color: C.textMuted, marginTop: 3 }}>{usuario.email || 'Sin correo electrónico'}</div>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#fff' }}>{usuario.documento || '—'}</div>
              <div style={{ fontSize: '0.85rem' }}>
                <span style={{
                  background: 'rgba(255,255,255,0.06)',
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  color: '#fff',
                  textTransform: 'capitalize'
                }}>
                  {usuario.rolBase || 'usuario'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => onActivoToggle(usuario)}
                  disabled={isUpdating}
                  style={{
                    background: usuario.activo ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    border: `1px solid ${usuario.activo ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: usuario.activo ? '#A7F3D0' : '#FCA5A5',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {usuario.activo ? 'Activo' : 'Inactivo'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  onClick={() => setExpandedUserId(isExpanded ? null : usuario.id)}
                  style={{
                    background: isExpanded ? 'rgba(255,255,255,0.12)' : 'transparent',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '0.78rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    transition: 'all 0.12s'
                  }}
                >
                  {isExpanded ? 'Ocultar Permisos' : 'Ver Permisos'}
                </button>
              </div>
            </div>

            {/* Permissions Detail Matrix */}
            {isExpanded && (
              <div style={{
                background: 'rgba(0,0,0,0.4)',
                padding: '24px 32px',
                borderTop: `1px solid ${C.surfaceBorder}`,
              }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em', color: C.accent }}>
                  Matriz de Permisos por Componente Estático DOXA
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {componentesEstaticos.map(comp => {
                    const p = usuario.permisos.find(x => x.componenteId === comp.id) || {
                      componenteId: comp.id,
                      puedeVer: false,
                      puedeAprobar: false,
                      puedeDevolver: false,
                      puedeReemplazar: false,
                      puedeSincronizarBackup: false,
                      puedeExportar: false
                    };

                    return (
                      <div key={comp.id} style={{
                        display: 'grid',
                        gridTemplateColumns: '2.5fr 3fr',
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        paddingBottom: 10
                      }}>
                        <div style={{ fontWeight: 650, fontSize: '0.85rem', color: C.textPrimary }}>
                          {comp.nombre}
                        </div>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 16,
                        }}>
                          {[
                            { key: 'puedeVer', label: '👁️ Ver' },
                            { key: 'puedeAprobar', label: '✅ Aprobar' },
                            { key: 'puedeDevolver', label: '↩️ Devolver' },
                            { key: 'puedeReemplazar', label: '🔄 Reemplazar' },
                            { key: 'puedeSincronizarBackup', label: '🛡️ Backup' },
                            { key: 'puedeExportar', label: '📥 Exportar' }
                          ].map(perm => (
                            <label key={perm.key} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: '0.78rem',
                              color: p[perm.key as keyof Omit<Permiso, 'componenteId'>] ? '#fff' : C.textMuted,
                              cursor: 'pointer',
                              userSelect: 'none'
                            }}>
                              <input
                                type="checkbox"
                                checked={p[perm.key as keyof Omit<Permiso, 'componenteId'>]}
                                disabled={isUpdating}
                                onChange={(e) => onPermissionChange(
                                  usuario,
                                  comp.id,
                                  perm.key as keyof Omit<Permiso, 'componenteId'>,
                                  e.target.checked
                                )}
                                style={{
                                  accentColor: C.accent,
                                  cursor: 'pointer'
                                }}
                              />
                              {perm.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}
