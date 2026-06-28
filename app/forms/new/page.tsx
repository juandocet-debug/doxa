'use client';

import { useState } from 'react';
import Link from 'next/link';

type FieldType = 'text' | 'textarea' | 'dropdown' | 'date' | 'file';

interface Field { type: FieldType; label: string; options: string[]; }
interface LogicRule { sourceFieldIndex: number; optionIndex: number; targetFieldIndex: number; }

const FIELD_LABELS: Record<FieldType, string> = {
  text: 'Texto corto', textarea: 'Texto largo', dropdown: 'Desplegable', date: 'Fecha', file: 'Carga de archivo',
};

const EXAMPLE = {
  title: 'Registro de componentes',
  fields: [
    { type: 'dropdown' as FieldType, label: 'Componente', options: ['Componente 1', 'Componente 2', 'Componente 3'] },
    { type: 'dropdown' as FieldType, label: 'Acciones del Componente 1', options: ['Acción 1.1', 'Acción 1.2', 'Acción 1.3'] },
    { type: 'dropdown' as FieldType, label: 'Acciones del Componente 2', options: ['Acción 2.1', 'Acción 2.2', 'Acción 2.3'] },
    { type: 'dropdown' as FieldType, label: 'Acciones del Componente 3', options: ['Acción 3.1', 'Acción 3.2', 'Acción 3.3'] },
    { type: 'dropdown' as FieldType, label: 'Persona responsable', options: ['Luisa', 'Andrés', 'Juan'] },
    { type: 'date' as FieldType, label: 'Fecha', options: [] },
    { type: 'file' as FieldType, label: 'Fotografía', options: [] },
  ],
  logic: [
    { sourceFieldIndex: 0, optionIndex: 0, targetFieldIndex: 1 },
    { sourceFieldIndex: 0, optionIndex: 1, targetFieldIndex: 2 },
    { sourceFieldIndex: 0, optionIndex: 2, targetFieldIndex: 3 },
  ],
};

const EXAMPLE_TIPO_ARCHIVO = {
  title: 'Solicitud con tipo de archivo',
  fields: [
    { type: 'dropdown' as FieldType, label: 'Selecciona una opción', options: ['A.1 - Reporte técnico', 'A.2 - Inspección visual', 'A.3 - Solicitud general'] },
    { type: 'dropdown' as FieldType, label: '¿Qué tipo de archivo adjuntas? (A.1)', options: ['Imagen', 'Documento escrito', 'PDF', 'Video'] },
    { type: 'dropdown' as FieldType, label: '¿Qué tipo de archivo adjuntas? (A.2)', options: ['Fotografía', 'Captura de pantalla', 'PDF del informe'] },
    { type: 'dropdown' as FieldType, label: '¿Qué tipo de archivo adjuntas? (A.3)', options: ['Formulario firmado', 'Correo adjunto', 'Otro documento'] },
    { type: 'file' as FieldType, label: 'Carga tu archivo aquí', options: [] },
    { type: 'date' as FieldType, label: 'Fecha de solicitud', options: [] },
  ],
  logic: [
    { sourceFieldIndex: 0, optionIndex: 0, targetFieldIndex: 1 },
    { sourceFieldIndex: 0, optionIndex: 1, targetFieldIndex: 2 },
    { sourceFieldIndex: 0, optionIndex: 2, targetFieldIndex: 3 },
  ],
};

export default function NewFormPage() {
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [logic, setLogic] = useState<LogicRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ formId: string; url: string } | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  const loadExample = (ex: typeof EXAMPLE) => {
    setTitle(ex.title);
    setFields(ex.fields);
    setLogic(ex.logic);
    setShowGuide(false);
  };

  const addField = () => setFields([...fields, { type: 'text', label: '', options: [] }]);
  const updateField = (i: number, patch: Partial<Field>) =>
    setFields(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const removeField = (i: number) => {
    setFields(fields.filter((_, idx) => idx !== i));
    setLogic(logic.filter((l) => l.sourceFieldIndex !== i && l.targetFieldIndex !== i));
  };
  const addOption = (i: number) => updateField(i, { options: [...fields[i].options, ''] });
  const updateOption = (fi: number, oi: number, val: string) => {
    const opts = [...fields[fi].options]; opts[oi] = val;
    updateField(fi, { options: opts });
  };
  const removeOption = (fi: number, oi: number) =>
    updateField(fi, { options: fields[fi].options.filter((_, idx) => idx !== oi) });

  const dropdownFields = fields.map((f, i) => ({ ...f, index: i })).filter((f) => f.type === 'dropdown');
  const nonSourceFields = (sourceIdx: number) => fields.map((f, i) => ({ ...f, index: i })).filter((f) => f.index !== sourceIdx);

  const addLogic = () => {
    const src = dropdownFields[0]?.index ?? 0;
    const tgt = fields.findIndex((_, i) => i !== src);
    if (tgt < 0) return;
    setLogic([...logic, { sourceFieldIndex: src, optionIndex: 0, targetFieldIndex: tgt }]);
  };
  const updateLogic = (i: number, patch: Partial<LogicRule>) =>
    setLogic(logic.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const handleSubmit = async (status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED') => {
    if (!title.trim()) return setError('Ingresa un título para el formulario');
    if (fields.length === 0) return setError('Agrega al menos un campo');
    const emptyLabel = fields.findIndex((f) => !f.label.trim());
    if (emptyLabel >= 0) return setError(`El campo ${emptyLabel + 1} no tiene etiqueta`);
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/create-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), fields, logic, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear el formulario');
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Formulario creado!</h2>
          <p className="text-gray-500 mb-6">Ya está publicado y listo para recibir respuestas.</p>
          <a href={result.url} target="_blank" rel="noopener noreferrer"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg mb-3 transition">
            Abrir formulario ↗
          </a>
          <Link href={`/forms/${result.formId}`}
            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg mb-3 transition">
            Ver respuestas
          </Link>
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Volver al inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← Volver</Link>
        <h1 className="text-xl font-bold text-gray-800">Crear formulario</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">

        {/* Guía listas enlazadas */}
        {showGuide && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl overflow-hidden">
            <div className="bg-blue-600 px-5 py-3 flex items-center justify-between">
              <span className="text-white font-bold text-sm">🔗 ¿Cómo funcionan las listas enlazadas?</span>
              <button onClick={() => setShowGuide(false)} className="text-blue-200 hover:text-white text-lg">×</button>
            </div>
            <div className="p-5">
              {/* Diagrama visual */}
              <div className="bg-white rounded-lg border border-blue-200 p-4 mb-4">
                <p className="text-xs text-blue-500 font-semibold mb-3 uppercase tracking-wide">Así funciona:</p>
                <div className="flex items-start gap-2 text-sm">
                  <div className="bg-blue-100 border border-blue-300 rounded-lg px-3 py-2 text-center min-w-[110px]">
                    <p className="text-xs text-blue-500 mb-1">Lista principal</p>
                    <p className="font-bold text-blue-800">Componente 1</p>
                    <p className="font-bold text-blue-800">Componente 2</p>
                    <p className="font-bold text-blue-800">Componente 3</p>
                  </div>
                  <div className="flex flex-col gap-1 pt-2 text-blue-400 font-mono text-xs">
                    <span>→ si elige 1</span>
                    <span>→ si elige 2</span>
                    <span>→ si elige 3</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="bg-green-50 border border-green-300 rounded-lg px-3 py-1 text-xs text-green-700">muestra: Acción 1.1 / 1.2 / 1.3</div>
                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-1 text-xs text-yellow-700">muestra: Acción 2.1 / 2.2 / 2.3</div>
                    <div className="bg-purple-50 border border-purple-300 rounded-lg px-3 py-1 text-xs text-purple-700">muestra: Acción 3.1 / 3.2 / 3.3</div>
                  </div>
                </div>
              </div>

              {/* Pasos */}
              <div className="space-y-2 mb-4">
                {[
                  'Crea un campo Desplegable con las opciones principales (ej: Componente 1, 2, 3).',
                  'Crea UN desplegable separado por cada opción, con sus sub-opciones.',
                  'En "Lógica condicional", define: Si [principal] = Componente 1 → mostrar [sub-lista 1].',
                  'Repite una regla por cada opción principal.',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => loadExample(EXAMPLE)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition text-sm"
                >
                  ✨ Ejemplo 1: Componente → Acción → Persona → Fecha → Foto
                </button>
                <button
                  onClick={() => loadExample(EXAMPLE_TIPO_ARCHIVO)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-lg transition text-sm"
                >
                  📎 Ejemplo 2: Pregunta A → si A.1 pide tipo de archivo → sube archivo
                </button>
              </div>
            </div>
          </div>
        )}

        {!showGuide && (
          <button onClick={() => setShowGuide(true)} className="text-sm text-blue-600 hover:underline">
            🔗 Ver guía de listas enlazadas
          </button>
        )}

        {/* Título */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Título del formulario</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Registro de inspección"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>

        {/* Campos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">Campos</h2>
            <button onClick={addField} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition">
              + Agregar campo
            </button>
          </div>

          {fields.length === 0 && (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              Haz clic en &quot;+ Agregar campo&quot; o usa el ejemplo de arriba
            </div>
          )}

          {fields.map((field, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-400 w-5 shrink-0">{i + 1}</span>
                <select value={field.type}
                  onChange={(e) => updateField(i, { type: e.target.value as FieldType, options: [] })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {Object.entries(FIELD_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <input type="text" value={field.label} onChange={(e) => updateField(i, { label: e.target.value })}
                  placeholder="Nombre del campo"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <button onClick={() => removeField(i)} className="text-red-400 hover:text-red-600 text-xl font-bold shrink-0">×</button>
              </div>

              {field.type === 'dropdown' && (
                <div className="ml-8 space-y-2">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Opciones del desplegable:</p>
                  {field.options.length === 0 && (
                    <p className="text-xs text-orange-500 italic">⚠ Agrega al menos una opción</p>
                  )}
                  {field.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-4">{oi + 1}.</span>
                      <input type="text" value={opt} onChange={(e) => updateOption(i, oi, e.target.value)}
                        placeholder={`Opción ${oi + 1}`}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                      <button onClick={() => removeOption(i, oi)} className="text-red-400 hover:text-red-600 text-lg">×</button>
                    </div>
                  ))}
                  <button onClick={() => addOption(i)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    + Agregar opción
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Lógica condicional — siempre visible si hay al menos 1 dropdown */}
        {dropdownFields.length >= 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-700">🔗 Listas enlazadas</h2>
                <p className="text-xs text-gray-400 mt-0.5">Define qué sub-lista aparece según la selección</p>
              </div>
              {dropdownFields.length >= 2 && (
                <button onClick={addLogic} className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg transition">
                  + Agregar regla
                </button>
              )}
            </div>

            {/* Aviso: necesitas al menos 2 desplegables */}
            {dropdownFields.length < 2 && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">⚠ Necesitas al menos 2 campos Desplegable</p>
                <p className="text-sm text-amber-700">
                  Ya tienes <strong>&quot;{dropdownFields[0]?.label || 'tu primer desplegable'}&quot;</strong>.<br/>
                  Ahora agrega <strong>un Desplegable separado por cada opción</strong> con sus sub-opciones:
                </p>
                <ul className="mt-2 text-sm text-amber-700 space-y-0.5 list-none">
                  {(dropdownFields[0]?.options || []).slice(0, 4).map((opt, i) => (
                    <li key={i} className="flex items-center gap-2">
                       <span className="text-amber-500">→</span>
                      Desplegable para <strong>&quot;{opt}&quot;</strong> con sus sub-opciones
                    </li>
                  ))}
                  {(dropdownFields[0]?.options || []).length === 0 && (
                    <li className="text-amber-500 italic">Primero agrega opciones al desplegable de arriba</li>
                  )}
                </ul>
                <button
                  onClick={addField}
                  className="mt-3 bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded-lg transition font-medium"
                >
                  + Agregar sub-desplegable
                </button>
              </div>
            )}

            {dropdownFields.length >= 2 && logic.length === 0 && (
              <div className="text-center py-5 text-gray-400 border-2 border-dashed border-purple-200 rounded-xl text-sm">
                Haz clic en <strong>&quot;+ Agregar regla&quot;</strong> para enlazar los desplegables
              </div>
            )}

            {logic.map((rule, i) => {
              const srcField = fields[rule.sourceFieldIndex];
              const validOptions = srcField?.options || [];
              const targets = nonSourceFields(rule.sourceFieldIndex);
              return (
                <div key={i} className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="text-xs text-purple-500 font-semibold mb-2 uppercase tracking-wide">Regla {i + 1}</div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-purple-700 font-semibold">Si</span>
                    <select value={rule.sourceFieldIndex}
                      onChange={(e) => updateLogic(i, { sourceFieldIndex: +e.target.value, optionIndex: 0 })}
                      className="border border-purple-300 bg-white rounded-lg px-2 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300">
                      {dropdownFields.map((f) => (
                        <option key={f.index} value={f.index}>{f.label || `Campo ${f.index + 1}`}</option>
                      ))}
                    </select>
                    <span className="text-purple-700 font-semibold">es igual a</span>
                    <select value={rule.optionIndex}
                      onChange={(e) => updateLogic(i, { optionIndex: +e.target.value })}
                      className="border border-purple-300 bg-white rounded-lg px-2 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300">
                      {validOptions.length === 0
                        ? <option value={0}>— sin opciones —</option>
                        : validOptions.map((opt, oi) => (
                          <option key={oi} value={oi}>{opt || `Opción ${oi + 1}`}</option>
                        ))}
                    </select>
                    <span className="text-purple-700 font-semibold">→ mostrar</span>
                    <select value={rule.targetFieldIndex}
                      onChange={(e) => updateLogic(i, { targetFieldIndex: +e.target.value })}
                      className="border border-purple-300 bg-white rounded-lg px-2 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300">
                      {targets.map((f) => (
                        <option key={f.index} value={f.index}>{f.label || `Campo ${f.index + 1}`}</option>
                      ))}
                    </select>
                    <button onClick={() => setLogic(logic.filter((_, li) => li !== i))}
                      className="text-red-400 hover:text-red-600 ml-auto text-xl font-bold">×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 text-sm">{error}</div>}

        <div className="flex gap-3">
          <button onClick={() => handleSubmit('DRAFT')} disabled={loading}
            className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-700 font-semibold py-3 rounded-xl transition text-base">
            {loading ? '...' : '💾 Guardar borrador'}
          </button>
          <button onClick={() => handleSubmit('PUBLISHED')} disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition text-base">
            {loading ? 'Creando...' : '🚀 Publicar formulario'}
          </button>
        </div>
      </main>
    </div>
  );
}
