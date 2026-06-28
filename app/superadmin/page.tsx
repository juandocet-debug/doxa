'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface SubStat {
  submissionId: string; grupo: string; clase: string; fechaEnvio: string;
  totalBytes: number; totalFotos: number; estado: string;
  componenteNombre: string; componenteId: string;
}
interface CompStat {
  id: string; nombre: string; formId: string;
  totalSubmissions: number; totalFotos: number; totalBytes: number;
  pendiente: number; aprobada: number; rechazada: number;
  submissions: SubStat[];
}
interface Stats {
  globalBytes: number; globalFotos: number; globalSubs: number;
  storageLimitBytes: number; storagePercent: number;
  componentes: CompStat[]; topPesadas: SubStat[];
}

const C = {
  bg:           'linear-gradient(135deg,#10071F 0%,#24104B 52%,#421B6D 100%)',
  surface:      'rgba(20,8,42,0.88)',
  surfaceBorder:'rgba(203,170,255,0.22)',
  filter:       'rgba(17,9,35,0.72)',
  filterBorder: 'rgba(255,255,255,0.14)',
  ghost:        'rgba(255,255,255,0.11)',
  ghostBorder:  'rgba(255,255,255,0.16)',
  lime:         '#C8FF7A',
  primary:      '#F7F2FF',
  muted:        '#CFC2DF',
  rowBorder:    'rgba(255,255,255,0.1)',
  errorBg:      'rgba(255,77,121,0.18)',
  errorBorder:  'rgba(255,77,121,0.35)',
  errorText:    '#FFE6EC',
  warn:         '#FBBF24',
  warnBg:       'rgba(251,191,36,0.15)',
};

function fmt(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024)        return `${(bytes / (1024 ** 2)).toFixed(1)} MB`;
  if (bytes >= 1024)               return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function StorageBar({ used, total, height = 10 }: { used: number; total: number; height?: number }) {
  const pct = Math.min(100, (used / total) * 100);
  const color = pct > 85 ? '#f87171' : pct > 60 ? C.warn : C.lime;
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height, overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width .6s ease' }} />
    </div>
  );
}

export default function SuperAdminPage() {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState<'dashboard' | 'componentes' | 'pesadas'>('dashboard');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/superadmin/stats', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setStats(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { if (!d.isSuperAdmin) window.location.href = '/login'; else load(); })
      .catch(() => { window.location.href = '/login'; });
  }, [load]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  const sBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '0 14px', minHeight: 34, borderRadius: 8,
    border: `1px solid ${C.ghostBorder}`, background: C.ghost,
    color: C.primary, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid rgba(200,255,122,0.2)`, borderTopColor: C.lime, borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: C.muted, fontSize: '0.9rem' }}>Cargando estadísticas…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const pct = stats?.storagePercent ?? 0;
  const storageColor = pct > 85 ? '#f87171' : pct > 60 ? C.warn : C.lime;

  return (
    <div style={{ minHeight: '100vh', width: '100vw', maxWidth: '100%', overflowX: 'hidden', background: C.bg, fontFamily: 'Inter,ui-sans-serif,sans-serif' }}>

      {/* Header */}
      <header style={{ background: C.filter, borderBottom: `1px solid ${C.filterBorder}`, padding: '12px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: C.lime, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 2 }}>Acceso total · Sistema de Evidencias</div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 850, color: C.primary, margin: 0 }}>Panel Super Administrador</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={load} style={sBtn}>↻ Actualizar</button>
            <Link href="/admin/evidencias" style={{ ...sBtn, textDecoration: 'none' }}>Ver como coordinador</Link>
            <button onClick={logout} style={{ ...sBtn, color: C.errorText, borderColor: C.errorBorder }}>⎋ Cerrar sesión</button>
          </div>
        </div>
      </header>

      {/* Alerta si almacenamiento alto */}
      {pct > 70 && (
        <div style={{ background: pct > 85 ? C.errorBg : C.warnBg, borderBottom: `1px solid ${pct > 85 ? C.errorBorder : 'rgba(251,191,36,0.3)'}`, padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.1rem' }}>{pct > 85 ? '🚨' : '⚠️'}</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: pct > 85 ? C.errorText : C.warn }}>
            {pct > 85
              ? `Almacenamiento crítico: ${pct}% usado (${fmt(stats!.globalBytes)} de ${fmt(stats!.storageLimitBytes)}). Descarga los ZIPs y contacta a Tally.`
              : `Almacenamiento al ${pct}% — considera descargar evidencias próximamente.`}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ background: C.filter, borderBottom: `1px solid ${C.filterBorder}`, padding: '0 28px' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {([['dashboard', 'Dashboard'], ['componentes', 'Por componente'], ['pesadas', 'Más pesadas']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '11px 18px', fontSize: '0.78rem', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', color: tab === key ? C.lime : C.muted, borderBottom: tab === key ? `2px solid ${C.lime}` : '2px solid transparent', transition: 'all .15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <main style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {error && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '12px 16px', color: C.errorText, fontSize: '0.85rem' }}>{error}</div>}

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && stats && (
          <>
            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {[
                { label: 'Envíos totales', value: stats.globalSubs, icon: '📋', color: C.lime },
                { label: 'Fotos totales', value: stats.globalFotos, icon: '📸', color: '#93C5FD' },
                { label: 'Aprobadas', value: stats.componentes.reduce((a, c) => a + c.aprobada, 0), icon: '✅', color: '#4ADE80' },
                { label: 'Pendientes', value: stats.componentes.reduce((a, c) => a + c.pendiente, 0), icon: '⏳', color: C.warn },
                { label: 'Rechazadas', value: stats.componentes.reduce((a, c) => a + c.rechazada, 0), icon: '❌', color: '#F87171' },
                { label: 'Almacenamiento', value: fmt(stats.globalBytes), icon: '💾', color: storageColor },
              ].map(({ label, value, icon, color }) => (
                <div key={label} style={{ background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 850, color, lineHeight: 1 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Barra de almacenamiento principal */}
            <div style={{ background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 14, padding: '22px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 800, color: C.lime, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Almacenamiento Tally</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: C.muted }}>
                    <span style={{ color: storageColor, fontWeight: 800, fontSize: '1.1rem' }}>{fmt(stats.globalBytes)}</span>
                    {' '} de {fmt(stats.storageLimitBytes)} usados
                  </p>
                </div>
                <span style={{ fontSize: '1.6rem', fontWeight: 850, color: storageColor }}>{pct}%</span>
              </div>
              <StorageBar used={stats.globalBytes} total={stats.storageLimitBytes} height={14} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: '0.68rem', color: C.muted }}>0</span>
                <span style={{ fontSize: '0.68rem', color: C.muted }}>Plan Pro: {fmt(stats.storageLimitBytes)}</span>
              </div>
            </div>

            {/* Mini barras por componente */}
            <div style={{ background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 14, padding: '20px 24px' }}>
              <p style={{ margin: '0 0 16px', fontSize: '0.65rem', fontWeight: 800, color: C.lime, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Uso por componente</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {stats.componentes.map(c => {
                  const cpct = stats.globalBytes > 0 ? Math.round((c.totalBytes / stats.storageLimitBytes) * 1000) / 10 : 0;
                  return (
                    <div key={c.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.78rem', color: C.primary, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                          {c.nombre.split(':')[0].trim()}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: C.muted, flexShrink: 0 }}>
                          {fmt(c.totalBytes)} · {c.totalFotos} fotos · {c.totalSubmissions} envíos
                        </span>
                      </div>
                      <StorageBar used={c.totalBytes} total={stats.storageLimitBytes} height={7} />
                      <p style={{ margin: '3px 0 0', fontSize: '0.65rem', color: C.muted }}>{cpct}% del límite total</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── POR COMPONENTE ── */}
        {tab === 'componentes' && stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {stats.componentes.map(comp => (
              <div key={comp.id} style={{ background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 14, overflow: 'hidden' }}>
                {/* Header componente */}
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.rowBorder}`, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: C.primary }}>{comp.nombre}</p>
                    <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', color: C.muted }}>{comp.totalSubmissions} envíos</span>
                      <span style={{ fontSize: '0.72rem', color: C.muted }}>{comp.totalFotos} fotos</span>
                      <span style={{ fontSize: '0.72rem', color: C.lime, fontWeight: 700 }}>{fmt(comp.totalBytes)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: 20, background: 'rgba(74,222,128,0.12)', color: '#4ade80', fontWeight: 700 }}>✓ {comp.aprobada}</span>
                    <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: 20, background: C.warnBg, color: C.warn, fontWeight: 700 }}>⏳ {comp.pendiente}</span>
                    <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: 20, background: C.errorBg, color: '#f87171', fontWeight: 700 }}>✕ {comp.rechazada}</span>
                  </div>
                </div>

                {/* Tabla de submissions */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                        {['Grupo', 'Clase', 'Fecha', 'Fotos', 'Peso', 'Estado'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 14px', color: C.lime, fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${C.rowBorder}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comp.submissions.map(s => {
                        const sc = s.estado === 'aprobada' ? '#4ade80' : s.estado === 'rechazada' ? '#f87171' : C.warn;
                        return (
                          <tr key={s.submissionId} style={{ borderBottom: `1px solid ${C.rowBorder}` }}>
                            <td style={{ padding: '8px 14px', color: C.primary, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.grupo.split('—')[1]?.trim() || s.grupo}</td>
                            <td style={{ padding: '8px 14px', color: C.lime, fontWeight: 700 }}>{s.clase}</td>
                            <td style={{ padding: '8px 14px', color: C.muted, whiteSpace: 'nowrap' }}>{new Date(s.fechaEnvio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td style={{ padding: '8px 14px', color: C.primary, textAlign: 'center' }}>{s.totalFotos}</td>
                            <td style={{ padding: '8px 14px', color: s.totalBytes > 10 * 1024 * 1024 ? '#f87171' : C.primary, fontWeight: s.totalBytes > 10 * 1024 * 1024 ? 800 : 400 }}>{fmt(s.totalBytes)}</td>
                            <td style={{ padding: '8px 14px' }}>
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: s.estado === 'aprobada' ? 'rgba(74,222,128,0.12)' : s.estado === 'rechazada' ? C.errorBg : C.warnBg, color: sc }}>
                                {s.estado}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MÁS PESADAS ── */}
        {tab === 'pesadas' && stats && (
          <div style={{ background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.rowBorder}` }}>
              <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 800, color: C.lime, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Top 10 envíos más pesados</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: C.muted }}>Identifica qué envíos consumen más almacenamiento</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {['#', 'Componente', 'Grupo', 'Clase', 'Fotos', 'Peso', '% del límite', 'Estado'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '9px 16px', color: C.lime, fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${C.rowBorder}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.topPesadas.map((s, i) => {
                    const spct  = Math.round((s.totalBytes / stats.storageLimitBytes) * 1000) / 10;
                    const heavy = s.totalBytes > 15 * 1024 * 1024;
                    const sc    = s.estado === 'aprobada' ? '#4ade80' : s.estado === 'rechazada' ? '#f87171' : C.warn;
                    return (
                      <tr key={s.submissionId} style={{ borderBottom: `1px solid ${C.rowBorder}`, background: heavy ? 'rgba(248,113,113,0.04)' : 'none' }}>
                        <td style={{ padding: '10px 16px', color: C.muted, fontWeight: 800 }}>#{i + 1}</td>
                        <td style={{ padding: '10px 16px', color: C.primary, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.componenteNombre.split(':')[0].trim()}</td>
                        <td style={{ padding: '10px 16px', color: C.muted, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.grupo.split('—')[1]?.trim() || s.grupo}</td>
                        <td style={{ padding: '10px 16px', color: C.lime, fontWeight: 700 }}>{s.clase}</td>
                        <td style={{ padding: '10px 16px', color: C.primary, textAlign: 'center' }}>{s.totalFotos}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 800, color: heavy ? '#f87171' : C.primary }}>{fmt(s.totalBytes)}</td>
                        <td style={{ padding: '10px 16px', minWidth: 140 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(100, spct * 20)}%`, background: heavy ? '#f87171' : C.lime, borderRadius: 99 }} />
                            </div>
                            <span style={{ fontSize: '0.7rem', color: heavy ? '#f87171' : C.muted, fontWeight: 700, flexShrink: 0 }}>{spct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: s.estado === 'aprobada' ? 'rgba(74,222,128,0.12)' : s.estado === 'rechazada' ? C.errorBg : C.warnBg, color: sc }}>
                            {s.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.16); border-radius: 3px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
