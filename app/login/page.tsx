'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const C = {
  bg: '#040806',
  surface: '#070D0A',
  border: '#112217',
  inputBg: '#09120E',
  inputBorder: '#14271C',
  inputFocus: '#10B981',
  lime: '#10B981',
  primary: '#FFFFFF',
  muted: '#A3B899',
  errorBg: 'rgba(239, 68, 68, 0.1)',
  errorBorder: 'rgba(239, 68, 68, 0.3)',
  errorText: '#FCA5A5',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [compId, setCompId] = useState(searchParams.get('comp') || '');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => {
      if (r.ok) router.replace('/admin/evidencias');
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!compId.trim()) {
      setError('Ingresa tu usuario o cédula');
      return;
    }
    if (!password) {
      setError('Ingresa tu contraseña');
      return;
    }
    setLoading(true);
    setError('');

    // Normalizar ID ingresado por el usuario
    let finalId = compId.trim().toLowerCase();
    if (finalId === '1' || finalId === 'comp1') {
      finalId = 'comp1';
    } else if (finalId === '2' || finalId === 'comp2') {
      finalId = 'comp2';
    } else if (finalId === '3' || finalId === 'comp3') {
      finalId = 'comp3';
    } else if (finalId === '5' || finalId === 'comp5') {
      finalId = 'comp5';
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compId: finalId, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        return;
      }
      router.replace('/admin/evidencias');
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      {/* Panel Izquierdo - Imagen de fondo y branding */}
      <div className="login-left-panel">
        <div className="brand-header">
          <img src="/acced/logo.png" alt="Agora Logo" className="brand-logo" />
          <div className="brand-divider" />
          <div className="brand-text">
            <span className="brand-title">Plataforma de gobernanza</span>
            <span className="brand-title">institucional</span>
          </div>
        </div>

        <div className="feature-card">
          <span className="feature-text">
            Herramientas que fortalecen la gestión, promueven la transparencia y generan valor público.
          </span>
        </div>
      </div>

      {/* Panel Derecho - Formulario */}
      <div className="login-right-panel">
        <div className="login-form-wrapper">
          <h2 className="welcome-title">Bienvenido</h2>
          <p className="welcome-desc">
            Accede a la plataforma de seguimiento, auditoría y control de proyectos institucionales.
          </p>

          {error && (
            <div className="error-alert">
              <svg className="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            {/* Input Usuario */}
            <div className="input-group">
              <label className="input-label">Usuario / Cédula</label>
              <div className="input-wrapper">
                <svg className="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  type="text"
                  value={compId}
                  onChange={(e) => {
                    setCompId(e.target.value);
                    setError('');
                  }}
                  placeholder="Ingresa tu cédula o usuario"
                  className="form-input"
                  required
                />
              </div>
            </div>

            {/* Input Contraseña */}
            <div className="input-group">
              <label className="input-label">Contraseña</label>
              <div className="input-wrapper">
                <svg className="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="••••••••••••"
                  className="form-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="toggle-password-btn"
                  title={showPwd ? 'Ocultar' : 'Mostrar'}
                >
                  {showPwd ? (
                    <svg className="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Botón Ingresar */}
            <button type="submit" disabled={loading} className="submit-button">
              {loading ? (
                <div className="loader-row">
                  <span className="spinner" />
                  <span>Verificando...</span>
                </div>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          {/* Enlace recuperar clave */}
          <div className="forgot-password-wrapper">
            <a href="#" className="forgot-password-link" onClick={(e) => e.preventDefault()}>
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="footer-wrapper">
          <span className="footer-text">Plataforma de uso interno  •  CORPOACIIC</span>
        </div>
      </div>

      <style>{`
        .login-container {
          display: flex;
          min-height: 100vh;
          background-color: ${C.bg};
          font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
          color: ${C.primary};
        }

        /* Panel Izquierdo */
        .login-left-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          background-image: linear-gradient(to right, rgba(4, 8, 6, 0.4), rgba(4, 8, 6, 0.9)), url('/acced/fondo.png');
          background-size: cover;
          background-position: center;
          border-right: 1px solid ${C.border};
        }

        .brand-header {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .brand-logo {
          height: 56px;
          object-fit: contain;
        }

        .brand-divider {
          width: 1px;
          height: 48px;
          background-color: ${C.border};
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-title {
          font-size: 14px;
          font-weight: 500;
          color: rgba(255,255,255,0.75);
          line-height: 20px;
        }

        .feature-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background-color: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 16px;
          border-radius: 12px;
          max-width: 400px;
          backdrop-filter: blur(8px);
        }

        .feature-text {
          font-size: 13px;
          color: rgba(255,255,255,0.65);
          line-height: 19px;
        }

        /* Panel Derecho */
        .login-right-panel {
          width: 480px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 56px;
          background-color: #050A07;
        }

        .login-form-wrapper {
          margin-top: auto;
          margin-bottom: auto;
          width: 100%;
        }

        .welcome-title {
          font-size: 2.2rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
          color: ${C.primary};
        }

        .welcome-desc {
          font-size: 0.9rem;
          line-height: 1.5;
          color: ${C.muted};
          margin-bottom: 32px;
        }

        .error-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: ${C.errorBg};
          border: 1px solid ${C.errorBorder};
          color: ${C.errorText};
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.82rem;
          margin-bottom: 24px;
        }

        .error-icon {
          width: 18px;
          height: 18px;
          color: #EF4444;
          flex-shrink: 0;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: ${C.lime};
          letter-spacing: 0.02em;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          width: 18px;
          height: 18px;
          color: ${C.muted};
          pointer-events: none;
        }

        .form-input {
          width: 100%;
          height: 52px;
          background-color: ${C.inputBg};
          border: 1px solid ${C.inputBorder};
          border-radius: 10px;
          padding: 0 46px;
          color: ${C.primary};
          font-size: 0.9rem;
          outline: none;
          transition: all 0.2s ease;
        }

        .form-input:focus {
          border-color: ${C.inputFocus};
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }

        .toggle-password-btn {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          cursor: pointer;
          color: ${C.muted};
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .eye-icon {
          width: 18px;
          height: 18px;
        }

        .submit-button {
          height: 52px;
          background-color: #10B981;
          color: #FFFFFF;
          font-size: 0.95rem;
          font-weight: 700;
          border: none;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .submit-button:hover {
          background-color: #059669;
          box-shadow: 0 6px 18px rgba(5, 150, 105, 0.5);
        }

        .submit-button:disabled {
          background-color: rgba(16, 185, 129, 0.4);
          box-shadow: none;
          cursor: not-allowed;
        }

        .loader-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255, 255, 255, 0.2);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .forgot-password-wrapper {
          text-align: center;
          margin-top: 24px;
        }

        .forgot-password-link {
          font-size: 0.82rem;
          color: ${C.lime};
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .forgot-password-link:hover {
          color: #34D399;
          text-decoration: underline;
        }

        .footer-wrapper {
          text-align: center;
          margin-top: auto;
        }

        .footer-text {
          font-size: 0.72rem;
          color: #556B58;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Adaptabilidad Móvil */
        @media (max-width: 860px) {
          .login-left-panel {
            display: none;
          }
          .login-right-panel {
            width: 100%;
            padding: 32px 24px;
            background-color: ${C.bg};
          }
          .welcome-title {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: '#040806',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10B981',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Cargando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
