'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface EvidenciaRequerida {
  id: string;
  nombre: string;
  tipoArchivo: string;
  multiple: boolean;
  obligatorio: boolean;
  orden: number;
}

interface InstanciaAccion {
  id: string;
  nombre: string;
  numero: number | null;
  tipo: string | null;
  orden: number;
}

interface Accion {
  id: string;
  nombre: string;
  descripcion: string | null;
  requiereInstancia: boolean;
  tipoInstancia: string | null;
  cantidadInstancias: number | null;
  instancias: InstanciaAccion[];
  evidenciasReq: EvidenciaRequerida[];
}

interface Componente {
  id: string;
  nombre: string;
  acciones: Accion[];
}

interface Meta {
  id: string;
  nombre: string;
  componentes: Componente[];
}

interface PhotoPreview {
  file: File;
  url: string;
}

interface EvidenciaState {
  id: string;
  fotos: PhotoPreview[];
}

export default function RegistroPage() {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<{ registroId: string } | null>(null);
  const [error, setError] = useState('');

  const [selectedMetaId, setSelectedMetaId] = useState('');
  const [selectedComponenteId, setSelectedComponenteId] = useState('');
  const [selectedAccionId, setSelectedAccionId] = useState('');
  const [selectedInstanciaId, setSelectedInstanciaId] = useState('');

  const [fechaActividad, setFechaActividad] = useState('');
  const [responsable, setResponsable] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [lugar, setLugar] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [evidenciasState, setEvidenciasState] = useState<EvidenciaState[]>([]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch('/api/estructura')
      .then((r) => r.json())
      .then((d) => {
        setMetas(d.metas || []);
        setLoading(false);
      })
      .catch(() => {
        setError('No se pudo cargar la estructura de datos');
        setLoading(false);
      });
  }, []);

  const selectedMeta = metas.find((m) => m.id === selectedMetaId);
  const selectedComponente = selectedMeta?.componentes.find((c) => c.id === selectedComponenteId);
  const selectedAccion = selectedComponente?.acciones.find((a) => a.id === selectedAccionId);

  const handleMetaChange = (metaId: string) => {
    setSelectedMetaId(metaId);
    setSelectedComponenteId('');
    setSelectedAccionId('');
    setSelectedInstanciaId('');
    setEvidenciasState([]);
  };

  const handleComponenteChange = (compId: string) => {
    setSelectedComponenteId(compId);
    setSelectedAccionId('');
    setSelectedInstanciaId('');
    setEvidenciasState([]);
  };

  const handleAccionChange = (accionId: string) => {
    setSelectedAccionId(accionId);
    setSelectedInstanciaId('');
    const accion = selectedComponente?.acciones.find((a) => a.id === accionId);
    if (accion) {
      setEvidenciasState(
        accion.evidenciasReq.map((er) => ({ id: er.id, fotos: [] }))
      );
    } else {
      setEvidenciasState([]);
    }
  };

  const handleFilesAdded = (evidenciaId: string, files: FileList | null) => {
    if (!files) return;
    const newPhotos: PhotoPreview[] = Array.from(files).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setEvidenciasState((prev) =>
      prev.map((ev) =>
        ev.id === evidenciaId
          ? { ...ev, fotos: [...ev.fotos, ...newPhotos] }
          : ev
      )
    );
  };

  const handleRemovePhoto = (evidenciaId: string, idx: number) => {
    setEvidenciasState((prev) =>
      prev.map((ev) => {
        if (ev.id !== evidenciaId) return ev;
        const newFotos = [...ev.fotos];
        URL.revokeObjectURL(newFotos[idx].url);
        newFotos.splice(idx, 1);
        return { ...ev, fotos: newFotos };
      })
    );
  };

  const allObligatoriosMet = () => {
    if (!selectedAccion) return false;
    return selectedAccion.evidenciasReq.every((er) => {
      if (!er.obligatorio) return true;
      const state = evidenciasState.find((e) => e.id === er.id);
      return (state?.fotos?.length ?? 0) > 0;
    });
  };

  const handleSubmit = async (modo: 'borrador' | 'completo') => {
    if (!selectedMetaId || !selectedComponenteId || !selectedAccionId || !fechaActividad || !responsable || !municipio) {
      setError('Por favor complete todos los campos requeridos');
      return;
    }
    if (selectedAccion?.requiereInstancia && !selectedInstanciaId) {
      setError('Por favor seleccione la instancia (clase/sesión)');
      return;
    }
    if (modo === 'completo' && !allObligatoriosMet()) {
      setError('Debe cargar todas las evidencias obligatorias antes de enviar');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // 1. Create registro
      const regRes = await fetch('/api/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metaId: selectedMetaId,
          componenteId: selectedComponenteId,
          accionId: selectedAccionId,
          instanciaAccionId: selectedInstanciaId || undefined,
          fechaActividad,
          responsable,
          municipio,
          localidad,
          lugar,
          observaciones,
          createdBy: responsable,
        }),
      });

      if (!regRes.ok) {
        const err = await regRes.json();
        throw new Error(err.error || 'Error al crear el registro');
      }

      const { registro } = await regRes.json();

      // 2. Upload fotos for each evidencia
      for (const evState of evidenciasState) {
        if (evState.fotos.length === 0) continue;

        // Find the evidenciaCargada id from the registro
        const evidenciaCargada = registro.evidencias.find(
          (e: { evidenciaRequeridaId: string }) => e.evidenciaRequeridaId === evState.id
        );
        if (!evidenciaCargada) continue;

        const formData = new FormData();
        formData.append('evidenciaCargadaId', evidenciaCargada.id);
        formData.append('uploadedBy', responsable);
        for (const foto of evState.fotos) {
          formData.append('fotos', foto.file);
        }

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || 'Error al subir archivos');
        }
      }

      // 3. Update estado if completo
      if (modo === 'completo') {
        await fetch(`/api/registros/${registro.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'enviado' }),
        });
      }

      setSuccess({ registroId: registro.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  const estadoColor: Record<string, string> = {
    pendiente: 'bg-gray-100 text-gray-600',
    cargada: 'bg-blue-100 text-blue-700',
    aprobada: 'bg-green-100 text-green-700',
    observada: 'bg-yellow-100 text-yellow-700',
    rechazada: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-lg">Cargando estructura...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-green-200 shadow-lg p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">Registro guardado</h2>
          <p className="text-gray-500 mb-6">El registro se ha guardado exitosamente.</p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/admin/${success.registroId}`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition"
            >
              Ver detalle del registro
            </Link>
            <Link
              href="/admin"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium transition"
            >
              Ir al panel de administración
            </Link>
            <button
              onClick={() => {
                setSuccess(null);
                setSelectedMetaId('');
                setSelectedComponenteId('');
                setSelectedAccionId('');
                setSelectedInstanciaId('');
                setFechaActividad('');
                setResponsable('');
                setMunicipio('');
                setLocalidad('');
                setLugar('');
                setObservaciones('');
                setEvidenciasState([]);
              }}
              className="text-blue-600 hover:underline text-sm"
            >
              Registrar otra actividad
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-700 text-white px-6 py-4 shadow">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Sistema de Evidencias</h1>
            <p className="text-blue-200 text-sm">Registro de actividades y evidencias fotográficas</p>
          </div>
          <Link href="/admin" className="text-blue-200 hover:text-white text-sm underline">
            Panel de administración
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Nueva actividad</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Step 1: Cascading selects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Meta */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Meta <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedMetaId}
                onChange={(e) => handleMetaChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">-- Seleccione una meta --</option>
                {metas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>

            {/* Componente */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Componente <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedComponenteId}
                onChange={(e) => handleComponenteChange(e.target.value)}
                disabled={!selectedMetaId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">-- Seleccione un componente --</option>
                {selectedMeta?.componentes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            {/* Accion */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Acción <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedAccionId}
                onChange={(e) => handleAccionChange(e.target.value)}
                disabled={!selectedComponenteId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">-- Seleccione una acción --</option>
                {selectedComponente?.acciones.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>

            {/* Instancia (conditional) */}
            {selectedAccion?.requiereInstancia && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {selectedAccion.tipoInstancia || 'Instancia'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedInstanciaId}
                  onChange={(e) => setSelectedInstanciaId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">-- Seleccione --</option>
                  {selectedAccion.instancias.map((i) => (
                    <option key={i.id} value={i.id}>{i.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Step 2: Activity data (only when accion selected) */}
          {selectedAccionId && (
            <>
              <div className="border-t border-gray-100 pt-5 mb-5">
                <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">
                  Datos de la actividad
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Fecha de la actividad <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={fechaActividad}
                      onChange={(e) => setFechaActividad(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Responsable <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={responsable}
                      onChange={(e) => setResponsable(e.target.value)}
                      placeholder="Nombre del responsable"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Municipio <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={municipio}
                      onChange={(e) => setMunicipio(e.target.value)}
                      placeholder="Municipio"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Localidad</label>
                    <input
                      type="text"
                      value={localidad}
                      onChange={(e) => setLocalidad(e.target.value)}
                      placeholder="Localidad (opcional)"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Lugar exacto</label>
                    <input
                      type="text"
                      value={lugar}
                      onChange={(e) => setLugar(e.target.value)}
                      placeholder="Lugar / dirección (opcional)"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Observaciones adicionales (opcional)"
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Evidence cards */}
              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-sm font-bold text-gray-700 mb-1 uppercase tracking-wide">
                  Evidencias requeridas
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Cargue las fotos para cada evidencia requerida. Formatos permitidos: JPG, PNG, WEBP. Máx 10MB por archivo.
                </p>

                {/* Checklist summary */}
                <div className="bg-blue-50 rounded-lg p-3 mb-5 flex flex-wrap gap-3">
                  {(selectedAccion?.evidenciasReq ?? []).map((er) => {
                    const state = evidenciasState.find((e) => e.id === er.id);
                    const count = state?.fotos.length ?? 0;
                    const ok = count > 0;
                    return (
                      <div
                        key={er.id}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${ok ? 'bg-green-100 text-green-700' : er.obligatorio ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-gray-100 text-gray-500'}`}
                      >
                        <span>{ok ? '✓' : er.obligatorio ? '!' : '○'}</span>
                        <span>{er.nombre}</span>
                        {count > 0 && <span>({count})</span>}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {(selectedAccion?.evidenciasReq ?? []).map((er) => {
                    const state = evidenciasState.find((e) => e.id === er.id);
                    const fotos = state?.fotos ?? [];

                    return (
                      <div
                        key={er.id}
                        className={`border rounded-xl p-4 ${fotos.length > 0 ? 'border-green-300 bg-green-50/30' : er.obligatorio ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800">{er.nombre}</h4>
                            <div className="flex gap-2 mt-1">
                              {er.obligatorio && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                                  Obligatorio
                                </span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fotos.length > 0 ? estadoColor['cargada'] : estadoColor['pendiente']}`}>
                                {fotos.length > 0 ? `${fotos.length} foto${fotos.length !== 1 ? 's' : ''}` : 'Sin fotos'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[er.id]?.click()}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                          >
                            <span>+</span> Agregar foto
                          </button>
                        </div>

                        <input
                          ref={(el) => { fileInputRefs.current[er.id] = el; }}
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp"
                          multiple={er.multiple}
                          className="hidden"
                          onChange={(e) => handleFilesAdded(er.id, e.target.files)}
                          onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                        />

                        {fotos.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {fotos.map((foto, idx) => (
                              <div key={idx} className="relative group w-20 h-20">
                                <img
                                  src={foto.url}
                                  alt={foto.file.name}
                                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemovePhoto(er.id, idx)}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition leading-none"
                                  title="Eliminar foto"
                                >
                                  ×
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-0.5 rounded-b-lg truncate opacity-0 group-hover:opacity-100 transition">
                                  {(foto.file.size / 1024).toFixed(0)}KB
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t border-gray-100 pt-5 mt-5 flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => handleSubmit('borrador')}
                  disabled={saving}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-2.5 rounded-lg transition disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar borrador'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit('completo')}
                  disabled={saving || !allObligatoriosMet()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-lg transition"
                  title={!allObligatoriosMet() ? 'Complete todas las evidencias obligatorias' : ''}
                >
                  {saving ? 'Enviando...' : 'Enviar registro completo'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
