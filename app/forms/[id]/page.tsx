'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Question { id: string; type: string; label: string; }
interface Submission {
  id: string;
  isCompleted: boolean;
  submittedAt: string;
  responses: { questionId: string; answer: unknown }[];
}

export default function FormSubmissionsPage() {
  const { id } = useParams<{ id: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [formName, setFormName] = useState('Formulario');

  useEffect(() => {
    fetch(`/api/submissions/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setQuestions(d.questions || []);
        setSubmissions(d.submissions || []);
        if (d.submissions?.[0]) setFormName('Formulario');
      })
      .catch(() => setError('No se pudieron cargar las respuestas'))
      .finally(() => setLoading(false));
  }, [id]);

  const getAnswer = (sub: Submission, questionId: string): string => {
    const resp = sub.responses.find((r) => r.questionId === questionId);
    if (!resp) return '-';
    const a = resp.answer;
    if (Array.isArray(a)) {
      if (a[0]?.name) return a.map((f: { name: string }) => f.name).join(', ');
      return a.join(', ');
    }
    return a?.toString() || '-';
  };

  const hasImage = (sub: Submission): boolean =>
    sub.responses.some((r) => Array.isArray(r.answer) && (r.answer[0] as { mimeType?: string })?.mimeType?.startsWith('image'));

  const downloadPdf = async (sub: Submission) => {
    setGeneratingPdf(sub.id);
    try {
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formTitle: formName, submission: sub, questions }),
      });
      if (!res.ok) throw new Error('Error generando PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respuesta-${sub.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      alert('Error al generar PDF: ' + (e instanceof Error ? e.message : 'Error desconocido'));
    } finally {
      setGeneratingPdf(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← Volver</Link>
        <h1 className="text-xl font-bold text-gray-800">Respuestas del formulario</h1>
        <span className="text-sm text-gray-400 ml-auto">{submissions.length} respuesta{submissions.length !== 1 ? 's' : ''}</span>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {loading && <div className="text-center py-20 text-gray-400">Cargando respuestas...</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4">{error}</div>}

        {!loading && !error && submissions.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">No hay respuestas aún</p>
            <p className="text-sm">Comparte el formulario para empezar a recibir respuestas</p>
          </div>
        )}

        {submissions.length > 0 && (
          <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Fecha</th>
                  {questions.slice(0, 4).map((q) => (
                    <th key={q.id} className="text-left px-4 py-3 text-gray-500 font-medium">{q.label}</th>
                  ))}
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Foto</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(sub.submittedAt).toLocaleDateString('es-CO')}
                    </td>
                    {questions.slice(0, 4).map((q) => (
                      <td key={q.id} className="px-4 py-3 text-gray-800 max-w-[150px] truncate">
                        {getAnswer(sub, q.id)}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      {hasImage(sub) ? (
                        <span className="text-green-600 font-medium">✓ Sí</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => downloadPdf(sub)}
                        disabled={generatingPdf === sub.id}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap"
                      >
                        {generatingPdf === sub.id ? 'Generando...' : '⬇ Descargar PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
