import { TallyFile } from './types';

const API = process.env.TALLY_API_URL || 'https://api.tally.so';
const KEY = process.env.TALLY_API_KEY!;

interface CacheEntry {
  data: {
    questions: { id: string; title: string; type: string }[];
    submissions: {
      id: string;
      submittedAt: string;
      createdAt: string;
      responses: { questionId: string; answer: unknown }[];
    }[];
  };
  timestamp: number;
}

const tallyCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 20 * 1000; // 20 seconds short-term cache

export async function fetchSubmissions(formId: string) {
  const cached = tallyCache.get(formId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const res = await fetch(`${API}/forms/${formId}/submissions?limit=500`, {
    headers: { Authorization: `Bearer ${KEY}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Tally API ${res.status} for form ${formId}`);
  const data = await res.json();
  const parsed = {
    questions: (data.questions ?? []) as { id: string; title: string; type: string }[],
    submissions: (data.submissions ?? []) as {
      id: string;
      submittedAt: string;
      createdAt: string;
      responses: { questionId: string; answer: unknown }[];
    }[],
  };

  tallyCache.set(formId, { data: parsed, timestamp: Date.now() });
  return parsed;
}

export function extractAnswer(answer: unknown): string {
  if (!answer) return '';
  if (Array.isArray(answer)) return (answer[0] as string) ?? '';
  return String(answer);
}

export function extractFiles(answer: unknown): TallyFile[] {
  if (!Array.isArray(answer)) return [];
  return answer.filter((f) => f && typeof f === 'object' && 'url' in f) as TallyFile[];
}
