'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// Design tokens
const C = {
  bg:            'linear-gradient(135deg, #020604 0%, #06110a 52%, #0b2214 100%)',
  surface:       'rgba(4,10,6,0.92)',
  surfaceBorder: 'rgba(255,255,255,0.06)',
  ghost:         'rgba(255,255,255,0.03)',
  ghostBorder:   'rgba(255,255,255,0.08)',
  accent:        '#10B981', // Emerald green
  textPrimary:   '#F2FFF6',
  textMuted:     '#9CB0A4',
  dangerBg:      'rgba(239,68,68,0.15)',
  dangerBorder:  'rgba(239,68,68,0.3)',
  dangerText:    '#FCA5A5',
};

interface Permiso {
  componenteId: string;
  puedeVer: boolean;
  puedeAprobar: boolean;
  puedeDevolver: boolean;
  puedeReemplazar: boolean;
  puedeSincronizarBackup: boolean;
  puedeExportar: boolean;
}

interface Usuario {
  id: string;
  nombre: string;
  email: string | null;
  documento: string | null;
  rolBase: string | null;
  activo: boolean;
  lastSyncedAt: string | null;
  permisos: Permiso[];
}

const COMPONENTES_ESTATICOS = [
  { id: 'comp1', nombre: 'Componente 1 — Mujeres Afro Usmeñas' },
  { id: 'comp2', nombre: 'Componente 2 — Mujeres Indígenas' },
  { id: 'comp3', nombre: 'Componente 3 — Mujeres Campesinas y Rurales' },
  { id: 'comp5', nombre: 'Componente 5 — Escuela Popular Artes/Oficios' },
];

export default function SuperadminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const loadUsuarios = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/superadmin/usuarios');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar usuarios');
      setUsuarios(data.usuarios || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsuarios();
  }, [loadUsuarios]);

  async function handleSync() {
    setSyncing(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/superadmin/usuarios/sync-icaro', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en la sincronización');
      setSuccessMsg(`Sincronización exitosa. Se procesaron ${data.count} usuarios.`);
      await loadUsuarios();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error en la sincronización');
    } finally {
      setSyncing(false);
    }
  }

  async function saveUserPermissions(usuario: Usuario, updatedPermisos: Permiso[], updatedActivo: boolean) {
    setUpdatingUserId(usuario.id);
    setError('');
    try {
      const res = await fetch('/api/superadmin/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: usuario.id,
          activo: updatedActivo,
          permisos: updatedPermisos
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar permisos');
      
      // Update local state
      setUsuarios(prev =>
        prev.map(u => (u.id === usuario.id ? { ...u, activo: updatedActivo, permisos: updatedPermisos } : u))
      );
      
      setSuccessMsg(`Permisos de ${usuario.nombre} actualizados con éxito.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar permisos');
    } finally {
      setUpdatingUserId(null);
    }
  }

  function handlePermissionChange(
    usuario: Usuario,
    componenteId: string,
    key: keyof Omit<Permiso, 'componenteId'>,
    value: boolean
  ) {
    const currentPerms = [...usuario.permisos];
    const index = currentPerms.findIndex(p => p.componenteId === componenteId);
    
    if (index === -1) {
      currentPerms.push({
        componenteId,
        puedeVer: false,
        puedeAprobar: false,
        puedeDevolver: false,
        puedeReemplazar: false,
        puedeSincronizarBackup: false,
        puedeExportar: false,
        [key]: value
      });
    } else {
      currentPerms[index] = {
        ...currentPerms[index],
        [key]: value
      };
    }
    
    saveUserPermissions(usuario, currentPerms, usuario.activo);
  }

  function handleActivoToggle(usuario: Usuario) {
    saveUserPermissions(usuario, usuario.permisos, !usuario.activo);
  }

  const filtered = usuarios.filter(u => {
    const term = search.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(term) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.documento && u.documento.includes(term))
    );
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      color: C.textPrimary,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '40px 24px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          marginBottom: 32
        }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 850, margin: 0, letterSpacing: '-0.03em' }}>
              Gestión de Permisos DOXA
            </h1>
            <p style={{ color: C.textMuted, margin: '6px 0 0', fontSize: '0.9rem' }}>
              Lista de usuarios sincronizados de Ágora/Icaro. Asigna permisos por componente estático.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                background: C.accent,
                color: '#020604',
                border: 'none',
                padding: '10px 18px',
                borderRadius: 8,
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: syncing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s',
                opacity: syncing ? 0.7 : 1
              }}
            >
              🔄 {syncing ? 'Sincronizando...' : 'Sincronizar Usuarios'}
            </button>
            <Link
              href="/admin/evidencias"
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: C.textPrimary,
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '10px 18px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: '0.85rem',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              📥 Ir a Evidencias
            </Link>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div style={{
            background: C.dangerBg,
            border: `1px solid ${C.dangerBorder}`,
            color: C.dangerText,
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 24,
            fontSize: '0.88rem'
          }}>
            ⚠️ {error}
          </div>
        )}
        {successMsg && (
          <div style={{
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.25)',
            color: '#A7F3D0',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 24,
            fontSize: '0.88rem'
          }}>
            ✅ {successMsg}
          </div>
        )}

        {/* Filter and Search */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.surfaceBorder}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 24
        }}>
          <input
            type="text"
            placeholder="Buscar usuario por nombre, correo o documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${C.ghostBorder}`,
              borderRadius: 8,
              padding: '12px 16px',
              color: '#fff',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'border-color 0.15s'
            }}
            onFocus={(e) => e.target.style.borderColor = C.accent}
            onBlur={(e) => e.target.style.borderColor = C.ghostBorder}
          />
        </div>

        {/* Users Table */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.surfaceBorder}`,
          borderRadius: 16,
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted }}>
              Cargando lista de usuarios…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted }}>
              No se encontraron usuarios.
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '16px 24px', background: 'rgba(0,0,0,0.2)', borderBottom: `1px solid ${C.surfaceBorder}`, fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: C.textMuted, letterSpacing: '0.05em' }}>
                <div>Usuario</div>
                <div>Documento</div>
                <div>Rol Base</div>
                <div style={{ textAlign: 'center' }}>Estado</div>
                <div style={{ textAlign: 'right' }}>Acciones</div>
              </div>

              {filtered.map(usuario => {
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
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{usuario.nombre}</div>
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
                          onClick={() => handleActivoToggle(usuario)}
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
                          {COMPONENTES_ESTATICOS.map(comp => {
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
                                        onChange={(e) => handlePermissionChange(
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
          )}
        </div>

      </div>
    </div>
  );
}
