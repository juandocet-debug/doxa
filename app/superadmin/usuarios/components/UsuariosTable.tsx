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
  fotoUrl: string | null;
  lastSyncedAt: string | null;
  permisos: Permiso[];
}

type PermisoKey = keyof Omit<Permiso, 'componenteId'>;

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
    key: PermisoKey,
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

const PERMISOS: { key: PermisoKey; label: string; icon: string }[] = [
  { key: 'puedeVer', label: 'Ver', icon: '⊙' },
  { key: 'puedeAprobar', label: 'Aprobar', icon: '✓' },
  { key: 'puedeDevolver', label: 'Devolver', icon: '↩' },
  { key: 'puedeReemplazar', label: 'Reemplazar', icon: '⇄' },
  { key: 'puedeSincronizarBackup', label: 'Backup', icon: '◇' },
  { key: 'puedeExportar', label: 'Exportar', icon: '⇣' },
];

function getInitials(usuario: Usuario) {
  const source = usuario.nombre || usuario.email || usuario.documento || 'U';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
}

function UserAvatar({ usuario }: { usuario: Usuario }) {
  const initials = getInitials(usuario);

  if (usuario.fotoUrl) {
    return (
      <img
        src={usuario.fotoUrl}
        alt={usuario.nombre}
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid rgba(16,185,129,0.75)',
          boxShadow: '0 0 16px rgba(16,185,129,0.25)'
        }}
      />
    );
  }

  return (
    <div style={{
      width: 42,
      height: 42,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      color: '#d1fae5',
      fontSize: '0.78rem',
      fontWeight: 850,
      border: '2px solid rgba(16,185,129,0.55)',
      background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(6,78,59,0.65))'
    }}>
      {initials}
    </div>
  );
}

function StatusButton({
  active,
  disabled,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 86,
        background: active ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${active ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.3)'}`,
        color: active ? '#A7F3D0' : '#FCA5A5',
        padding: '6px 12px',
        borderRadius: 999,
        fontSize: '0.74rem',
        fontWeight: 800,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.65 : 1
      }}
    >
      {active ? '✓ Activo' : 'Inactivo'}
    </button>
  );
}

function PermissionPill({
  value,
  disabled,
  onChange,
}: {
  value: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!value)}
      style={{
        minWidth: 64,
        height: 26,
        borderRadius: 999,
        border: `1px solid ${value ? 'rgba(16,185,129,0.45)' : 'rgba(255,255,255,0.08)'}`,
        background: value ? 'rgba(16,185,129,0.72)' : 'rgba(255,255,255,0.06)',
        color: value ? '#ecfdf5' : '#a9b9ae',
        fontSize: '0.72rem',
        fontWeight: 850,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6
      }}
    >
      <span aria-hidden="true">{value ? '✓' : '⊙'}</span>
      {value ? 'Si' : 'No'}
    </button>
  );
}

function getPermiso(usuario: Usuario, componenteId: string): Permiso {
  return usuario.permisos.find(x => x.componenteId === componenteId) || {
    componenteId,
    puedeVer: false,
    puedeAprobar: false,
    puedeDevolver: false,
    puedeReemplazar: false,
    puedeSincronizarBackup: false,
    puedeExportar: false
  };
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
      <div style={{ textAlign: 'center', padding: '54px 0', color: C.textMuted }}>
        Cargando lista de usuarios...
      </div>
    );
  }

  if (usuarios.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '54px 0', color: C.textMuted }}>
        No se encontraron usuarios.
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(260px,2fr) minmax(110px,1fr) minmax(90px,0.8fr) minmax(90px,0.8fr) minmax(130px,0.9fr)',
        padding: '14px 24px',
        background: 'rgba(255,255,255,0.025)',
        borderBottom: `1px solid ${C.surfaceBorder}`,
        fontSize: '0.72rem',
        fontWeight: 850,
        textTransform: 'uppercase',
        color: '#a8bcb0',
        letterSpacing: '0.04em'
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
          <div key={usuario.id} style={{ borderBottom: `1px solid ${C.surfaceBorder}` }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(260px,2fr) minmax(110px,1fr) minmax(90px,0.8fr) minmax(90px,0.8fr) minmax(130px,0.9fr)',
              padding: '18px 24px',
              alignItems: 'center',
              gap: 12,
              background: isExpanded ? 'rgba(255,255,255,0.025)' : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <button
                  type="button"
                  onClick={() => setExpandedUserId(isExpanded ? null : usuario.id)}
                  aria-label={isExpanded ? 'Ocultar permisos' : 'Ver permisos'}
                  style={{
                    width: 22,
                    height: 22,
                    border: 0,
                    background: 'transparent',
                    color: '#d1fae5',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  {isExpanded ? '⌃' : '⌄'}
                </button>
                <UserAvatar usuario={usuario} />
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontWeight: 850,
                    fontSize: '0.93rem',
                    color: C.textPrimary,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {usuario.nombre}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: C.textMuted, marginTop: 3 }}>
                    {usuario.email || 'Sin correo electronico'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.82rem', color: '#ecfdf5' }}>{usuario.documento || '-'}</div>
              <div>
                <span style={{
                  background: 'rgba(255,255,255,0.11)',
                  padding: '6px 10px',
                  borderRadius: 7,
                  fontSize: '0.73rem',
                  color: '#fff',
                  fontWeight: 800,
                  textTransform: 'capitalize',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span aria-hidden="true">♙</span>
                  {usuario.rolBase || 'usuario'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <StatusButton
                  active={usuario.activo}
                  disabled={isUpdating}
                  onClick={() => onActivoToggle(usuario)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setExpandedUserId(isExpanded ? null : usuario.id)}
                  style={{
                    minWidth: 132,
                    background: isExpanded ? 'rgba(16,185,129,0.12)' : 'transparent',
                    color: '#fff',
                    border: `1px solid ${isExpanded ? 'rgba(16,185,129,0.55)' : 'rgba(255,255,255,0.16)'}`,
                    padding: '8px 12px',
                    borderRadius: 7,
                    fontSize: '0.76rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: isExpanded ? '0 0 12px rgba(16,185,129,0.12)' : 'none'
                  }}
                >
                  <span aria-hidden="true">{isExpanded ? '⊘' : '⊙'}</span>
                  {isExpanded ? 'Ocultar Permisos' : 'Ver Permisos'}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div style={{
                margin: '0 16px 16px',
                background: 'rgba(3,13,9,0.82)',
                border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 10,
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '14px 16px',
                  borderBottom: `1px solid ${C.surfaceBorder}`,
                  color: C.accent,
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span aria-hidden="true">▣</span>
                  Matriz de permisos por componente estatico DOXA
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(240px,2.4fr) repeat(6, minmax(76px,1fr))',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 16px 8px',
                  color: '#cce8d7',
                  fontSize: '0.7rem',
                  fontWeight: 850
                }}>
                  <div>Componente</div>
                  {PERMISOS.map(perm => (
                    <div key={perm.key} style={{ textAlign: 'center' }}>
                      <span aria-hidden="true">{perm.icon}</span> {perm.label}
                    </div>
                  ))}
                </div>

                {componentesEstaticos.map(comp => {
                  const p = getPermiso(usuario, comp.id);

                  return (
                    <div
                      key={comp.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(240px,2.4fr) repeat(6, minmax(76px,1fr))',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 16px',
                        borderTop: '1px solid rgba(255,255,255,0.04)'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        color: C.textPrimary,
                        fontSize: '0.76rem',
                        fontWeight: 700
                      }}>
                        <span aria-hidden="true" style={{ color: C.accent, fontSize: '1rem' }}>♧</span>
                        {comp.nombre}
                      </div>
                      {PERMISOS.map(perm => (
                        <div key={perm.key} style={{ textAlign: 'center' }}>
                          <PermissionPill
                            value={p[perm.key]}
                            disabled={isUpdating}
                            onChange={(value) => onPermissionChange(usuario, comp.id, perm.key, value)}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
