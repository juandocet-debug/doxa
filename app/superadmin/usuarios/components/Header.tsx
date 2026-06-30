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
      gap: 18,
      marginBottom: 18
    }}>
      <div>
        <h1 style={{ fontSize: '1.55rem', fontWeight: 850, margin: 0, color: textPrimary }}>
          Gestion de Permisos DOXA
        </h1>
        <p style={{ color: textMuted, margin: '6px 0 0', fontSize: '0.82rem' }}>
          Lista de usuarios sincronizados de Agora/Icaro. Asigna permisos por componente estatico.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={onSync}
          disabled={syncing}
          style={{
            background: accent,
            color: '#020604',
            border: '1px solid rgba(167,243,208,0.55)',
            padding: '10px 18px',
            borderRadius: 8,
            fontWeight: 800,
            fontSize: '0.78rem',
            cursor: syncing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            opacity: syncing ? 0.7 : 1,
            boxShadow: syncing ? 'none' : '0 0 18px rgba(16,185,129,0.35)'
          }}
        >
          <span aria-hidden="true">↻</span>
          {syncing ? 'Sincronizando...' : 'Sincronizar Usuarios'}
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
            fontSize: '0.78rem',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span aria-hidden="true">▣</span>
          Ir a Evidencias
        </Link>
      </div>
    </div>
  );
}
