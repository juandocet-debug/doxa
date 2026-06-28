const API = process.env.TALLY_API_URL!;
const KEY = process.env.TALLY_API_KEY!;

const h = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' });

export interface TallyForm {
  id: string;
  name: string;
  status: string;
  submissionsCount: number;
  url: string;
  createdAt: string;
}

export interface TallyQuestion {
  id: string;
  type: string;
  label: string;
}

export interface TallySubmission {
  id: string;
  isCompleted: boolean;
  submittedAt: string;
  responses: { questionId: string; answer: unknown }[];
}

export async function listForms() {
  const res = await fetch(`${API}/forms?limit=50`, { headers: h(), cache: 'no-store' });
  if (!res.ok) throw new Error(`Tally error ${res.status}`);
  const data = await res.json();
  return { forms: (data.data?.forms || []) as TallyForm[], total: data.data?.total || 0 };
}

export async function getSubmissions(formId: string) {
  const res = await fetch(`${API}/forms/${formId}/submissions?limit=100`, {
    headers: h(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Tally error ${res.status}`);
  const data = await res.json();
  return {
    questions: (data.data?.questions || []) as TallyQuestion[],
    submissions: (data.data?.submissions || []) as TallySubmission[],
    total: data.data?.counts?.total || 0,
  };
}
