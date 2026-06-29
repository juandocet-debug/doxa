import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, AuthError } from '@/lib/session-helper';
import { COMPONENTES } from '@/lib/componentes';

const API = process.env.TALLY_API_URL!;
const KEY = process.env.TALLY_API_KEY!;
const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB

interface TallyFile { id: string; name: string; url: string; mimeType: string; size: number; }

export interface SubStat {
  submissionId: string;
  grupo: string;
  clase: string;
  fechaEnvio: string;
  totalBytes: number;
  totalFotos: number;
  estado: string;
  componenteNombre: string;
  componenteId: string;
}

export interface CompStat {
  id: string;
  nombre: string;
  formId: string;
  totalSubmissions: number;
  totalFotos: number;
  totalBytes: number;
  pendiente: number;
  aprobada: number;
  rechazada: number;
  submissions: SubStat[];
}

export interface StatsResponse {
  globalBytes: number;
  globalFotos: number;
  globalSubs: number;
  storageLimitBytes: number;
  storagePercent: number;
  componentes: CompStat[];
  topPesadas: SubStat[];
}

interface StatsCache {
  data: StatsResponse;
  timestamp: number;
}

let statsCache: StatsCache | null = null;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds stats cache TTL

export async function GET() {
  try {
    await requireSuperAdmin();

    // Check memory cache
    if (statsCache && Date.now() - statsCache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(statsCache.data);
    }

    const aprobaciones = await prisma.aprobacionTally.findMany();
    const aprobMap = new Map<string, string>(
      aprobaciones.map((a) => [a.tallySubmissionId, a.estado])
    );

    // Fetch all components' Tally data concurrently
    const fetchedResults = await Promise.allSettled(
      COMPONENTES.map(async (comp) => {
        const res = await fetch(`${API}/forms/${comp.formId}/submissions?limit=500`, {
          headers: { Authorization: `Bearer ${KEY}` },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Tally API ${res.status} for form ${comp.formId}`);
        const data = await res.json();
        return { comp, data };
      })
    );

    const compStats: CompStat[] = [];
    let globalBytes = 0, globalFotos = 0, globalSubs = 0;

    for (const result of fetchedResults) {
      if (result.status === 'rejected') continue;
      
      const { comp, data } = result.value;
      const questions = (data.questions ?? []) as { id: string; title: string; type: string }[];
      const subs      = (data.submissions ?? []) as {
        id: string; submittedAt: string; createdAt: string;
        responses: { questionId: string; answer: unknown }[];
      }[];

      const grupoQ = questions.find(q => q.title?.toLowerCase().includes('grupo') || q.title?.toLowerCase().includes('selecciona'));
      const claseQ = questions.find(q => q.title?.toLowerCase().includes('clase') || q.title?.toLowerCase().includes('número'));
      const fotoQs = questions.filter(q => q.type === 'FILE_UPLOAD');

      const stat: CompStat = {
        id: comp.id, nombre: comp.nombre, formId: comp.formId,
        totalSubmissions: 0, totalFotos: 0, totalBytes: 0,
        pendiente: 0, aprobada: 0, rechazada: 0, submissions: [],
      };

      for (const sub of subs) {
        const getAns     = (qId: string): unknown => sub.responses.find(r => r.questionId === qId)?.answer;
        const extractStr = (ans: unknown): string => Array.isArray(ans) ? String(ans[0] ?? '') : String(ans ?? '');
        const grupo = grupoQ ? extractStr(getAns(grupoQ.id)) : '';
        const clase = claseQ ? extractStr(getAns(claseQ.id)) : '';

        let subBytes = 0, subFotos = 0;
        for (const q of fotoQs) {
          const files = Array.isArray(getAns(q.id)) ? (getAns(q.id) as TallyFile[]) : [];
          for (const f of files) { if (f?.size) { subBytes += f.size; subFotos++; } }
        }

        const estado: string = aprobMap.get(sub.id) ?? 'pendiente';
        stat.totalSubmissions++;
        stat.totalFotos  += subFotos;
        stat.totalBytes  += subBytes;
        if (estado === 'aprobada') stat.aprobada++;
        else if (estado === 'rechazada') stat.rechazada++;
        else stat.pendiente++;

        stat.submissions.push({
          submissionId: sub.id, grupo, clase,
          fechaEnvio: sub.submittedAt ?? sub.createdAt,
          totalBytes: subBytes, totalFotos: subFotos, estado,
          componenteNombre: comp.nombre, componenteId: comp.id,
        });
      }

      stat.submissions.sort((a, b) => b.totalBytes - a.totalBytes);
      globalBytes += stat.totalBytes;
      globalFotos += stat.totalFotos;
      globalSubs  += stat.totalSubmissions;
      compStats.push(stat);
    }

    const topPesadas = compStats
      .flatMap(c => c.submissions)
      .sort((a, b) => b.totalBytes - a.totalBytes)
      .slice(0, 10);

    const statsResponse: StatsResponse = {
      globalBytes, globalFotos, globalSubs,
      storageLimitBytes: STORAGE_LIMIT_BYTES,
      storagePercent: Math.round((globalBytes / STORAGE_LIMIT_BYTES) * 1000) / 10,
      componentes: compStats,
      topPesadas,
    };

    // Save cache
    statsCache = { data: statsResponse, timestamp: Date.now() };

    return NextResponse.json(statsResponse);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
