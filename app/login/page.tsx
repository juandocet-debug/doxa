'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { COMPONENTES } from '@/lib/componentes';
import { Suspense } from 'react';

const C = {
  bg:          'linear-gradient(135deg, #10071F 0%, #24104B 52%, #421B6D 100%)',
  surface:     'rgba(20,8,42,0.88)',
  border:      'rgba(203,170,255,0.22)',
  inputBg:     'rgba(255,255,255,0.08)',
  inputBorder: 'rgba(255,255,255,0.18)',
  inputFocus:  '#C8FF7A',
  lime:        '#C8FF7A',
  primary:     '#F7F2FF',
  muted:       '#CFC2DF',
  error:       '#FFE6EC',
  errorBg:     'rgba(255,77,121,0.18)',
  errorBorder: 'rgba(255,77,121,0.35)',
};

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [compId, setCompId]     = useState(searchParams.get('comp') || '');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // Si ya está autenticado, redirigir
  useEffect(() => {
    fetch('/api/auth/me').then(r => { if (r.ok) router.replace('/admin/evidencias'); });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!compId) { setError('Selecciona tu componente'); return; }
    if (!password) { setError('Ingresa la contraseña'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compId, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al iniciar sesión'); return; }
      router.replace('/admin/evidencias');
    } catch { setError('Error de conexión. Inténtalo de nuevo.'); }
    finally { setLoading(false); }
  }

  const inputStyle = (focused = false): React.CSSProperties => ({
    width: '100%', background: C.inputBg,
    border: `1px solid ${focused ? C.inputFocus : C.inputBorder}`,
    borderRadius: 8, color: C.primary, padding: '0 14px', minHeight: 48,
    fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
    boxShadow: focused ? `0 0 0 3px rgba(200,255,122,0.18)` : 'none',
    transition: 'all .15s',
  });

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', fontFamily: 'Inter, ui-sans-serif, sans-serif' }}>

      {/* Panel izquierdo — branding (oculto en móvil) */}
      <div className="login-left" style={{ flex: '0 0 44%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 56px', borderRight: `1px solid rgba(255,255,255,0.08)` }}>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: C.lime, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 16 }}>
            Evidencias · UPN
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 850, color: C.primary, lineHeight: 1.06, margin: '0 0 20px' }}>
            Sistema de<br />Evidencias<br />
            <span style={{ color: C.lime }}>Fotográficas</span>
          </h1>
          <p style={{ fontSize: '0.95rem', color: C.muted, lineHeight: 1.6, maxWidth: 360, margin: '0 0 40px' }}>
            Plataforma de gestión y seguimiento de registros fotográficos para el proyecto de prevención del feminicidio y la violencia contra la mujer.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['📸', 'Carga y organización de evidencias'],
              ['✅', 'Aprobación y seguimiento por coordinador'],
              ['🔒', 'Acceso seguro por componente'],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(200,255,122,0.06)', border: '1px solid rgba(200,255,122,0.14)', borderRadius: 10, padding: '10px 16px' }}>
                <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                <span style={{ fontSize: '0.82rem', color: C.muted, fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ position: 'absolute', bottom: 24, fontSize: '0.72rem', color: 'rgba(255,255,255,0.22)' }}>
          Plataforma de uso interno · UPN
        </p>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Logo / título móvil */}
          <div className="login-mobile-header" style={{ display: 'none', marginBottom: 32, textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: C.lime, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Sistema de Evidencias · UPN</div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 850, color: C.primary, margin: 0 }}>Bienvenido</h1>
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '36px 32px', boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.primary, margin: '0 0 6px' }}>Iniciar sesión</h2>
            <p style={{ fontSize: '0.82rem', color: C.muted, margin: '0 0 28px', lineHeight: 1.5 }}>
              Accede con las credenciales de tu componente para revisar y aprobar evidencias.
            </p>

            {/* Error */}
            {error && (
              <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '10px 14px', color: C.error, fontSize: '0.82rem', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Componente */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#D8C8F6' }}>Componente</label>
                <select
                  value={compId}
                  onChange={e => { setCompId(e.target.value); setError(''); }}
                  style={{ ...inputStyle(), paddingRight: 14 }}
                  required
                >
                  <option value="" style={{ background: '#25143F' }}>— Selecciona tu componente —</option>
                  <option value="superadmin" style={{ background: '#25143F' }}>⚙️ Super Administrador</option>
                  {COMPONENTES.map(c => (
                    <option key={c.id} value={c.id} style={{ background: '#25143F' }}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Contraseña */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#D8C8F6' }}>Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Ingresa la contraseña"
                    style={{ ...inputStyle(), paddingRight: 48 }}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => !s)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '1rem', padding: 4 }}
                    title={showPwd ? 'Ocultar' : 'Mostrar'}
                  >
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Botón */}
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', minHeight: 48, borderRadius: 10, border: 'none', background: loading ? 'rgba(200,255,122,0.5)' : C.lime, color: '#130620', fontWeight: 850, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all .15s', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {loading ? (
                  <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(19,6,32,0.3)', borderTopColor: '#130620', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> Verificando…</>
                ) : 'Ingresar →'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', marginTop: 20 }}>
            Sistema de uso interno · Acceso restringido
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        select option { background: #25143F; color: #F7F2FF; }
        input::placeholder { color: rgba(255,255,255,0.28); }
        @media (max-width: 700px) {
          .login-left { display: none !important; }
          .login-mobile-header { display: block !important; }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#10071F,#24104B,#421B6D)', display:'flex', alignItems:'center', justifyContent:'center', color:'#C8FF7A', fontFamily:'Inter,sans-serif' }}>Cargando…</div>}>
      <LoginForm />
    </Suspense>
  );
}
