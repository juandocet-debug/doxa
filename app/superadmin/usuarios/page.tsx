'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { UsuariosTable, Usuario, Permiso } from './components/UsuariosTable';

const C = {
  bg: 'radial-gradient(circle at 20% 0%, rgba(20,184,166,0.12), transparent 30%), linear-gradient(135deg, #020604 0%, #06110a 52%, #0b2214 100%)',
  surface: 'rgba(4,10,8,0.88)',
  surfaceBorder: 'rgba(148,163,184,0.16)',
  ghost: 'rgba(255,255,255,0.035)',
  ghostBorder: 'rgba(255,255,255,0.12)',
  accent: '#10B981',
  textPrimary: '#F2FFF6',
  textMuted: '#9CB0A4',
  dangerBg: 'rgba(127,29,29,0.35)',
  dangerBorder: 'rgba(248,113,113,0.35)',
  dangerText: '#FCA5A5',
};

const COMPONENTES_ESTATICOS = [
  { id: 'comp1', nombre: 'Componente 1 - Mujeres Afro Usmenas' },
  { id: 'comp2', nombre: 'Componente 2 - Mujeres Indigenas' },
  { id: 'comp3', nombre: 'Componente 3 - Mujeres Campesinas y Rurales' },
  { id: 'comp5', nombre: 'Componente 5 - Escuela Popular Artes/Oficios' },
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
      if (!res.ok) throw new Error(data.error || 'Error en la sincronizacion');
      setSuccessMsg(`Sincronizacion exitosa. Se procesaron ${data.count} usuarios.`);
      await loadUsuarios();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error en la sincronizacion');
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

      setUsuarios(prev =>
        prev.map(u => (u.id === usuario.id ? { ...u, activo: updatedActivo, permisos: updatedPermisos } : u))
      );

      setSuccessMsg(`Permisos de ${usuario.nombre} actualizados con exito.`);
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

    const basePermiso = {
        componenteId,
        puedeVer: false,
        puedeAprobar: false,
        puedeDevolver: false,
        puedeReemplazar: false,
        puedeSincronizarBackup: false,
        puedeExportar: false,
    };

    const nextPermiso = {
      ...(index === -1 ? basePermiso : currentPerms[index]),
      [key]: value
    };

    if (key === 'puedeVer' && !value) {
      nextPermiso.puedeAprobar = false;
      nextPermiso.puedeDevolver = false;
      nextPermiso.puedeReemplazar = false;
      nextPermiso.puedeSincronizarBackup = false;
      nextPermiso.puedeExportar = false;
    }

    if (key !== 'puedeVer' && value) {
      nextPermiso.puedeVer = true;
    }

    if (index === -1) {
      currentPerms.push(nextPermiso);
    } else {
      currentPerms[index] = nextPermiso;
    }

    saveUserPermissions(usuario, currentPerms, usuario.activo);
  }

  function handleActivoToggle(usuario: Usuario) {
    saveUserPermissions(usuario, usuario.permisos, !usuario.activo);
  }

  const filtered = usuarios.filter(u => {
    const term = search.toLowerCase().trim();
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
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '26px 22px',
    }}>
      <div style={{ maxWidth: 1220, margin: '0 auto' }}>
        <Header
          syncing={syncing}
          onSync={handleSync}
          accent={C.accent}
          textPrimary={C.textPrimary}
          textMuted={C.textMuted}
        />

        {error && (
          <div style={{
            background: C.dangerBg,
            border: `1px solid ${C.dangerBorder}`,
            color: C.dangerText,
            borderRadius: 8,
            padding: '13px 16px',
            marginBottom: 18,
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <span aria-hidden="true">!</span>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'rgba(6,95,70,0.42)',
            border: '1px solid rgba(16,185,129,0.45)',
            color: '#A7F3D0',
            borderRadius: 8,
            padding: '13px 16px',
            marginBottom: 18,
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span aria-hidden="true">✓</span>
              {successMsg}
            </span>
            <button
              type="button"
              onClick={() => setSuccessMsg('')}
              aria-label="Cerrar mensaje"
              style={{
                background: 'transparent',
                border: 0,
                color: '#A7F3D0',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              x
            </button>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 48px',
          gap: 10,
          marginBottom: 18
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(0,0,0,0.36)',
            border: `1px solid ${C.ghostBorder}`,
            borderRadius: 8,
            padding: '0 14px',
            minHeight: 46
          }}>
            <span aria-hidden="true" style={{ color: C.textMuted }}>⌕</span>
            <input
              type="text"
              placeholder="Buscar usuario por nombre, correo o documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 0,
                color: '#fff',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
          </label>
          <button
            type="button"
            aria-label="Filtros"
            style={{
              height: 46,
              borderRadius: 8,
              border: `1px solid ${C.ghostBorder}`,
              background: 'rgba(0,0,0,0.34)',
              color: '#cbd5e1',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            ≡
          </button>
        </div>

        <div style={{
          background: C.surface,
          border: `1px solid ${C.surfaceBorder}`,
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 18px 50px rgba(0,0,0,0.24)'
        }}>
          <UsuariosTable
            usuarios={filtered}
            loading={loading}
            expandedUserId={expandedUserId}
            setExpandedUserId={setExpandedUserId}
            updatingUserId={updatingUserId}
            onActivoToggle={handleActivoToggle}
            onPermissionChange={handlePermissionChange}
            C={C}
            componentesEstaticos={COMPONENTES_ESTATICOS}
          />
        </div>
      </div>
    </div>
  );
}
