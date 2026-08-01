import { TallyFile } from './types';
import { cleanUrl } from './archive-resolver';

export interface TallyQuestion {
  id: string;
  title?: string;
  label?: string;
  type: string;
}

export interface TallyResponse {
  questionId: string;
  answer: unknown;
}

export interface TallyFileGroup {
  questionId: string;
  label: string;
  archivos: TallyFile[];
}

export function extractFiles(answer: unknown): TallyFile[] {
  if (!Array.isArray(answer)) return [];
  return answer.filter((f) => f && typeof f === 'object' && 'url' in f) as TallyFile[];
}

function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatRepeatedQuestionLabel(title: string, occurrence: number): string {
  const cleanTitle = title?.trim() || 'Archivo adjunto';
  if (occurrence <= 1) return cleanTitle;

  if (normalizeTitle(cleanTitle) === 'lista de asistencia') {
    return `Lista de asistencia adicional ${occurrence - 1}`;
  }

  return `${cleanTitle} ${occurrence}`;
}

export function getFileUploadQuestions(questions: TallyQuestion[]) {
  const seen = new Map<string, number>();

  return questions
    .filter((q) => q.type === 'FILE_UPLOAD')
    .map((q) => {
      const title = q.title ?? q.label ?? 'Archivo adjunto';
      const key = normalizeTitle(title);
      const occurrence = (seen.get(key) ?? 0) + 1;
      seen.set(key, occurrence);

      return {
        ...q,
        displayLabel: formatRepeatedQuestionLabel(title, occurrence),
      };
    });
}

export function getSubmissionFileGroups(
  responses: TallyResponse[],
  questions: TallyQuestion[],
): TallyFileGroup[] {
  const responsesByQuestion = new Map(responses.map((resp) => [resp.questionId, resp.answer]));

  return getFileUploadQuestions(questions)
    .map((q) => ({
      questionId: q.id,
      label: q.displayLabel,
      archivos: extractFiles(responsesByQuestion.get(q.id)),
    }))
    .filter((group) => group.archivos.length > 0);
}

export function getSubmissionFileUrls(responses: TallyResponse[], questions: TallyQuestion[]): string[] {
  return getSubmissionFileGroups(responses, questions)
    .flatMap((group) => group.archivos)
    .map((file) => cleanUrl(file.url));
}

export function hasMissingOrUnsyncedFiles(
  responses: TallyResponse[],
  questions: TallyQuestion[],
  archives: { tallyFileUrl: string; syncStatus: string }[],
): boolean {
  const archiveByUrl = new Map(archives.map((archive) => [cleanUrl(archive.tallyFileUrl), archive]));
  const currentUrls = getSubmissionFileUrls(responses, questions);

  if (currentUrls.length === 0) return false;
  return currentUrls.some((url) => archiveByUrl.get(url)?.syncStatus !== 'synced');
}
