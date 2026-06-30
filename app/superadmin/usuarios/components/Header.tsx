import React from 'react';
import Link from 'next/link';

interface HeaderProps {
  syncing: boolean;
  onSync: () => void;
  accent: string;
  textPrimary: string;
  textMuted: string;
}

export function Header({ syncing, onSync, accent, textPrimary, textMuted }: HeaderProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 20,
      marginBottom: 32
    }}>
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 850, margin: 0, letterSpacing: '-0.03em', color: textPrimary }}>
          Gestión de Permisos DOXA
        </h1>
        <p style={{ color: textMuted, margin: '6px 0 0', fontSize: '0.9rem' }}>
          Lista de usuarios sincronizados de Ágora/Icaro. Asigna permisos por componente estático.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onSync}
          disabled={syncing}
          style={{
            background: accent,
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
            color: textPrimary,
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
  );
}
