'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface ArchivoEvidencia {
  id: string;
  nombreOriginal: string;
  urlArchivo: string;
  tipoMime: string;
  peso: number;
}

interface EvidenciaCargada {
  id: string;
  estado: string;
  observacionRevision: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  evidenciaRequerida: {
    id: string;
    nombre: string;
    obligatorio: boolean;
    tipoArchivo: string;
  };
  archivos: ArchivoEvidencia[];
}

interface Registro {
  id: string;
  meta: { id: string; nombre: string };
  componente: { id: string; nombre: string };
  accion: { id: string; nombre: string };
  instancia?: { id: string; nombre: string } | null;
  fechaActividad: string;
  responsable: string;
  municipio: string;
  localidad: string | null;
  lugar: string | null;
  observaciones: string | null;
  estado: string;
  createdBy: string;
  createdAt: string;
  evidencias: EvidenciaCargada[];
}

const estadoColor: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-600',
  cargada: 'bg-blue-100 text-blue-700',
  aprobada: 'bg-green-100 text-green-700',
  observada: 'bg-yellow-100 text-yellow-700',
  rechazada: 'bg-red-100 text-red-700',
};

const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente',
  cargada: 'Cargada',
  aprobada: 'Aprobada',
  observada: 'Con observaciones',
  rechazada: 'Rechazada',
  borrador: 'Borrador',
  enviado: 'Enviado',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export default function AdminDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [registro, setRegistro] = useState<Registro | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Review state per evidencia
  const [reviewState, setReviewState] = useState<
    Record<string, { saving: boolean; observacion: string }>
  >({});

  useEffect(() => {
    if (!id) return;
    fetch(`/api/registros/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setRegistro(d.registro);
        // Initialize review state
        const initialReview: Record<string, { saving: boolean; observacion: string }> = {};
        for (const ev of d.registro.evidencias) {
          initialReview[ev.id] = { saving: false, observacion: ev.observacionRevision || '' };
        }
        setReviewState(initialReview);
      })
      .catch(() => setError('Error al cargar el registro'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleReview = async (
    evidenciaId: string,
    nuevoEstado: string,
    reviewer = 'Admin'
  ) => {
    setReviewState((prev) => ({
      ...prev,
      [evidenciaId]: { ...prev[evidenciaId], saving: true },
    }));

    try {
      const res = await fetch(`/api/admin/evidencias/${evidenciaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: nuevoEstado,
          observacionRevision: reviewState[evidenciaId]?.observacion || null,
          reviewedBy: reviewer,
        }),
      });
      if (!res.ok) throw new Error('Error al actualizar');

      const { evidencia } = await res.json();

      // Update local state
      setRegistro((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          evidencias: prev.evidencias.map((e) =>
            e.id === evidenciaId ? { ...e, ...evidencia } : e
          ),
        };
      });
    } catch {
      alert('Error al actualizar la evidencia');
    } finally {
      setReviewState((prev) => ({
        ...prev,
        [evidenciaId]: { ...prev[evidenciaId], saving: false },
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Cargando registro...</div>
      </div>
    );
  }

  if (error || !registro) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Registro no encontrado'}</p>
          <Link href="/admin" className="text-blue-600 hover:underline">Volver al panel</Link>
        </div>
      </div>
    );
  }

  const evAprobadas = registro.evidencias.filter((e) => e.estado === 'aprobada').length;
  const evTotal = registro.evidencias.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-gray-300"
            onClick={() => setLightboxUrl(null)}
          >
            ×
          </button>
          <img
            src={lightboxUrl}
            alt="Evidencia"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Header */}
      <header className="bg-blue-700 text-white px-6 py-4 shadow">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Detalle del Registro</h1>
            <p className="text-blue-200 text-xs font-mono mt-0.5">{registro.id}</p>
          </div>
          <div className="flex gap-3 items-center">
            <a
              href={`/api/export/pdf/${registro.id}`}
              target="_blank"
              className="bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-lg transition border border-white/30"
            >
              Descargar PDF
            </a>
            <Link href="/admin" className="text-blue-200 hover:text-white text-sm underline">
              Volver al panel
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* General info card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800">Información general</h2>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${estadoColor[registro.estado] || 'bg-gray-100 text-gray-600'}`}>
              {estadoLabel[registro.estado] || registro.estado}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ['Meta', registro.meta.nombre],
              ['Componente', registro.componente.nombre],
              ['Acción', registro.accion.nombre],
              ['Instancia', registro.instancia?.nombre || '—'],
              ['Responsable', registro.responsable],
              ['Municipio', registro.municipio],
              ['Localidad', registro.localidad || '—'],
              ['Lugar', registro.lugar || '—'],
              ['Fecha de actividad', new Date(registro.fechaActividad).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })],
              ['Creado por', registro.createdBy],
              ['Fecha de creación', new Date(registro.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })],
            ].map(([label, val]) => (
              <div key={label} className="flex gap-2">
                <span className="font-semibold text-gray-600 min-w-[140px] shrink-0">{label}:</span>
                <span className="text-gray-800">{val}</span>
              </div>
            ))}
            {registro.observaciones && (
              <div className="flex gap-2 md:col-span-2">
                <span className="font-semibold text-gray-600 min-w-[140px] shrink-0">Observaciones:</span>
                <span className="text-gray-800">{registro.observaciones}</span>
              </div>
            )}
          </div>

          {/* Evidence progress */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">Progreso de evidencias:</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${evTotal > 0 ? Math.round((evAprobadas / evTotal) * 100) : 0}%` }}
                />
              </div>
              <span className="text-sm text-gray-600 font-medium">{evAprobadas}/{evTotal} aprobadas</span>
            </div>
          </div>
        </div>

        {/* Evidencias */}
        {registro.evidencias.map((ev) => (
          <div key={ev.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            {/* Evidencia header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-800">{ev.evidenciaRequerida.nombre}</h3>
                <div className="flex gap-2 mt-1">
                  {ev.evidenciaRequerida.obligatorio && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Obligatorio</span>
                  )}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${estadoColor[ev.estado] || 'bg-gray-100 text-gray-600'}`}>
                    {estadoLabel[ev.estado] || ev.estado}
                  </span>
                  {ev.archivos.length > 0 && (
                    <span className="text-xs text-gray-400">{ev.archivos.length} archivo{ev.archivos.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Photos gallery */}
            {ev.archivos.length > 0 ? (
              <div className="flex flex-wrap gap-3 mb-4">
                {ev.archivos.map((arch) => (
                  <div key={arch.id} className="relative group">
                    <img
                      src={arch.urlArchivo}
                      alt={arch.nombreOriginal}
                      className="w-24 h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition"
                      onClick={() => setLightboxUrl(arch.urlArchivo)}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition truncate">
                      {arch.nombreOriginal}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-400 text-sm mb-4">
                Sin archivos cargados
              </div>
            )}

            {/* Review panel */}
            {ev.reviewedBy && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-500">
                Revisado por <span className="font-medium text-gray-700">{ev.reviewedBy}</span>
                {ev.reviewedAt && (
                  <> el {new Date(ev.reviewedAt).toLocaleDateString('es-CO')}</>
                )}
              </div>
            )}

            <div className="border-t border-gray-100 pt-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Observación de revisión
              </label>
              <textarea
                rows={2}
                value={reviewState[ev.id]?.observacion || ''}
                onChange={(e) =>
                  setReviewState((prev) => ({
                    ...prev,
                    [ev.id]: { ...prev[ev.id], observacion: e.target.value },
                  }))
                }
                placeholder="Escribe una observación (opcional)..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none mb-3"
              />
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleReview(ev.id, 'aprobada')}
                  disabled={reviewState[ev.id]?.saving}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  {reviewState[ev.id]?.saving ? '...' : 'Aprobar'}
                </button>
                <button
                  onClick={() => handleReview(ev.id, 'observada')}
                  disabled={reviewState[ev.id]?.saving}
                  className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  {reviewState[ev.id]?.saving ? '...' : 'Con observaciones'}
                </button>
                <button
                  onClick={() => handleReview(ev.id, 'rechazada')}
                  disabled={reviewState[ev.id]?.saving}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  {reviewState[ev.id]?.saving ? '...' : 'Rechazar'}
                </button>
                <button
                  onClick={() => handleReview(ev.id, 'pendiente')}
                  disabled={reviewState[ev.id]?.saving}
                  className="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  {reviewState[ev.id]?.saving ? '...' : 'Resetear'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
