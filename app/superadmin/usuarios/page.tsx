'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { UsuariosTable, Usuario, Permiso } from './components/UsuariosTable';

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
        <Header 
          syncing={syncing}
          onSync={handleSync}
          accent={C.accent}
          textPrimary={C.textPrimary}
          textMuted={C.textMuted}
        />

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
