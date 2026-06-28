'use client';

import { useState } from 'react';
import Link from 'next/link';
import { COMPONENTES, CLASES } from '@/lib/componentes';

type Estado = 'idle' | 'checking' | 'disponible' | 'enviado' | 'error';

export default function EvidenciasPage() {
  const [componenteId, setComponenteId] = useState('');
  const [grupo, setGrupo]               = useState('');
  const [clase, setClase]               = useState('');
  const [estado, setEstado]             = useState<Estado>('idle');
  const [errorMsg, setErrorMsg]         = useState('');

  const componente = COMPONENTES.find(c => c.id === componenteId);

  const handleVerificar = async () => {
    if (!componente || !grupo || !clase) return;
    setEstado('checking');
    setErrorMsg('');

    try {
      const params = new URLSearchParams({
        formId: componente.formId,
        grupo,
        clase,
      });
      const res = await fetch(`/api/check-submission?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al verificar');

      setEstado(data.alreadySubmitted ? 'enviado' : 'disponible');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Error de conexión');
      setEstado('error');
    }
  };

  const resetSeleccion = () => {
    setClase('');
    setEstado('idle');
    setErrorMsg('');
  };

  const tallyUrl = componente
    ? `https://tally.so/r/${componente.formId}`
    : '#';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-blue-800">Carga de Evidencias</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Selecciona componente, grupo y clase antes de cargar
            </p>
          </div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Inicio</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">

        {/* PASO 1: Selección */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">1</span>
            Selecciona tu actividad
          </h2>

          {/* Componente */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Componente</label>
            <select
              value={componenteId}
              onChange={e => { setComponenteId(e.target.value); setGrupo(''); setClase(''); setEstado('idle'); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">— Selecciona un componente —</option>
              {COMPONENTES.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Grupo */}
          {componenteId && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Grupo</label>
              <select
                value={grupo}
                onChange={e => { setGrupo(e.target.value); setClase(''); setEstado('idle'); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">— Selecciona tu grupo —</option>
                {componente?.grupos.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          )}

          {/* Clase */}
          {grupo && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Número de clase</label>
              <select
                value={clase}
                onChange={e => { setClase(e.target.value); setEstado('idle'); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">— Selecciona la clase —</option>
                {CLASES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Botón verificar */}
          {clase && estado === 'idle' && (
            <button
              onClick={handleVerificar}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition text-sm"
            >
              Verificar disponibilidad
            </button>
          )}
        </div>

        {/* PASO 2: Resultado de verificación */}

        {/* Verificando... */}
        {estado === 'checking' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-blue-700 text-sm font-medium">Verificando si ya fue enviada esta clase...</p>
          </div>
        )}

        {/* ❌ YA ENVIADA */}
        {estado === 'enviado' && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl shrink-0">🔒</span>
              <div>
                <h3 className="font-bold text-red-800 text-lg">Información ya enviada</h3>
                <p className="text-red-700 text-sm mt-1">
                  Las evidencias de <strong>{clase}</strong> del <strong>{grupo}</strong> ya fueron
                  cargadas anteriormente y no pueden volver a enviarse.
                </p>
              </div>
            </div>
            <div className="bg-red-100 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-800 text-sm font-medium">
                📞 Si necesitas hacer una corrección o tienes alguna duda, comunícate con tu
                <strong> coordinador de componente</strong>.
              </p>
            </div>
            <button
              onClick={resetSeleccion}
              className="text-sm text-red-600 hover:underline"
            >
              ← Seleccionar otra clase
            </button>
          </div>
        )}

        {/* ✅ DISPONIBLE */}
        {estado === 'disponible' && (
          <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl shrink-0">✅</span>
              <div>
                <h3 className="font-bold text-green-800 text-lg">Disponible para cargar</h3>
                <p className="text-green-700 text-sm mt-1">
                  Las evidencias de <strong>{clase}</strong> del <strong>{grupo}</strong> aún
                  no han sido enviadas. Puedes proceder a cargarlas.
                </p>
              </div>
            </div>
            <div className="bg-white border border-green-200 rounded-xl p-4 text-sm text-gray-600 space-y-1">
              <p><span className="font-semibold text-gray-700">Componente:</span> {componente?.nombre}</p>
              <p><span className="font-semibold text-gray-700">Grupo:</span> {grupo}</p>
              <p><span className="font-semibold text-gray-700">Clase:</span> {clase}</p>
            </div>
            <a
              href={tallyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition text-base"
            >
              📎 Ir a cargar evidencias →
            </a>
            <button
              onClick={resetSeleccion}
              className="text-sm text-green-700 hover:underline block mx-auto"
            >
              ← Seleccionar otra clase
            </button>
          </div>
        )}

        {/* ⚠️ Error */}
        {estado === 'error' && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-5 space-y-3">
            <p className="text-yellow-800 font-semibold text-sm">⚠️ No se pudo verificar: {errorMsg}</p>
            <div className="flex gap-3">
              <button
                onClick={handleVerificar}
                className="text-sm bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
              >
                Reintentar
              </button>
              <a
                href={tallyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-yellow-700 hover:underline py-2"
              >
                Ir al formulario de todas formas →
              </a>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
