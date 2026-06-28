'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Meta {
  id: string;
  nombre: string;
}

interface Componente {
  id: string;
  nombre: string;
}

interface Accion {
  id: string;
  nombre: string;
}

interface EvidenciaCargada {
  id: string;
  estado: string;
  evidenciaRequerida: { obligatorio: boolean };
  archivos: { id: string }[];
}

interface Registro {
  id: string;
  meta: Meta;
  componente: Componente;
  accion: Accion;
  instancia?: { nombre: string } | null;
  fechaActividad: string;
  responsable: string;
  municipio: string;
  estado: string;
  createdAt: string;
  evidencias: EvidenciaCargada[];
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [metas, setMetas] = useState<Meta[]>([]);

  // Filters
  const [filterMeta, setFilterMeta] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterResponsable, setFilterResponsable] = useState('');
  const [filterMunicipio, setFilterMunicipio] = useState('');
  const [filterDesde, setFilterDesde] = useState('');
  const [filterHasta, setFilterHasta] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (filterMeta) params.set('metaId', filterMeta);
    if (filterEstado) params.set('estado', filterEstado);
    if (filterResponsable) params.set('responsable', filterResponsable);
    if (filterMunicipio) params.set('municipio', filterMunicipio);
    if (filterDesde) params.set('desde', filterDesde);
    if (filterHasta) params.set('hasta', filterHasta);
    params.set('page', String(currentPage));
    params.set('limit', '20');
    return params.toString();
  }, [filterMeta, filterEstado, filterResponsable, filterMunicipio, filterDesde, filterHasta, currentPage]);

  const loadRegistros = useCallback(() => {
    setLoading(prev => prev ? prev : true);
    fetch(`/api/registros?${buildQueryString()}`)
      .then((r) => r.json())
      .then((d) => {
        setRegistros(d.registros || []);
        setPagination(d.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [buildQueryString]);

  useEffect(() => {
    fetch('/api/estructura')
      .then((r) => r.json())
      .then((d) => setMetas(d.metas || []));
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      loadRegistros();
    });
  }, [loadRegistros]);

  const estadoColor: Record<string, string> = {
    borrador: 'bg-yellow-100 text-yellow-700',
    enviado: 'bg-blue-100 text-blue-700',
    en_revision: 'bg-purple-100 text-purple-700',
    aprobado: 'bg-green-100 text-green-700',
    rechazado: 'bg-red-100 text-red-700',
  };

  const estadoLabel: Record<string, string> = {
    borrador: 'Borrador',
    enviado: 'Enviado',
    en_revision: 'En revisión',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
  };

  const calcProgress = (evidencias: EvidenciaCargada[]) => {
    const total = evidencias.length;
    if (total === 0) return { cargadas: 0, total: 0, pct: 0 };
    const cargadas = evidencias.filter((e) =>
      ['cargada', 'aprobada', 'observada'].includes(e.estado)
    ).length;
    return { cargadas, total, pct: Math.round((cargadas / total) * 100) };
  };

  const handleExportExcel = () => {
    const params = new URLSearchParams();
    if (filterMeta) params.set('metaId', filterMeta);
    if (filterEstado) params.set('estado', filterEstado);
    if (filterDesde) params.set('desde', filterDesde);
    if (filterHasta) params.set('hasta', filterHasta);
    window.open(`/api/export/excel?${params.toString()}`, '_blank');
  };

  const handleClearFilters = () => {
    setFilterMeta('');
    setFilterEstado('');
    setFilterResponsable('');
    setFilterMunicipio('');
    setFilterDesde('');
    setFilterHasta('');
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-700 text-white px-6 py-4 shadow">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Panel de Administración</h1>
            <p className="text-blue-200 text-sm">Gestión de registros y evidencias</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportExcel}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              Exportar Excel
            </button>
            <Link
              href="/registro"
              className="bg-white text-blue-700 hover:bg-blue-50 text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              + Nuevo registro
            </Link>
            <Link href="/" className="text-blue-200 hover:text-white text-sm underline self-center">
              Inicio
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">Filtros</h3>
            <button onClick={handleClearFilters} className="text-xs text-blue-600 hover:underline">
              Limpiar filtros
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <select
              value={filterMeta}
              onChange={(e) => { setFilterMeta(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Todas las metas</option>
              {metas.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre.substring(0, 40)}...</option>
              ))}
            </select>

            <select
              value={filterEstado}
              onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="enviado">Enviado</option>
              <option value="en_revision">En revisión</option>
              <option value="aprobado">Aprobado</option>
              <option value="rechazado">Rechazado</option>
            </select>

            <input
              type="text"
              value={filterResponsable}
              onChange={(e) => { setFilterResponsable(e.target.value); setCurrentPage(1); }}
              placeholder="Responsable..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <input
              type="text"
              value={filterMunicipio}
              onChange={(e) => { setFilterMunicipio(e.target.value); setCurrentPage(1); }}
              placeholder="Municipio..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <input
              type="date"
              value={filterDesde}
              onChange={(e) => { setFilterDesde(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="Desde"
            />

            <input
              type="date"
              value={filterHasta}
              onChange={(e) => { setFilterHasta(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="Hasta"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <span className="text-sm text-gray-500">
              {loading ? 'Cargando...' : `${pagination.total} registro${pagination.total !== 1 ? 's' : ''} encontrado${pagination.total !== 1 ? 's' : ''}`}
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-400">Cargando registros...</div>
          ) : registros.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <p className="text-lg mb-2">No hay registros</p>
              <Link href="/registro" className="text-blue-600 hover:underline text-sm">
                Crear primer registro
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs">Actividad</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs">Responsable</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs">Fecha</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs">Estado</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs">Evidencias</th>
                  <th className="px-4 py-3 text-gray-500 font-semibold text-xs text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((reg, i) => {
                  const progress = calcProgress(reg.evidencias);
                  return (
                    <tr
                      key={reg.id}
                      className={`border-b border-gray-100 hover:bg-blue-50/50 transition ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800 text-xs leading-tight">{reg.accion.nombre}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{reg.componente.nombre.substring(0, 50)}...</p>
                        {reg.instancia && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                            {reg.instancia.nombre}
                          </span>
                        )}
                        <p className="text-xs text-gray-300 mt-0.5">{reg.municipio}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-700">{reg.responsable}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-600">
                          {new Date(reg.fechaActividad).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${estadoColor[reg.estado] || 'bg-gray-100 text-gray-600'}`}>
                          {estadoLabel[reg.estado] || reg.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5 min-w-[60px]">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${progress.pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {progress.cargadas}/{progress.total}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/admin/${reg.id}`}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition"
                          >
                            Ver
                          </Link>
                          <a
                            href={`/api/export/pdf/${reg.id}`}
                            target="_blank"
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-2.5 py-1.5 rounded-lg transition border border-gray-200"
                          >
                            PDF
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-500">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages}
                className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
