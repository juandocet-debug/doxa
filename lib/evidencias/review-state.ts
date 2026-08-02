export type EvidenceReviewStatus = 'pendiente' | 'cumple' | 'no_cumple';

export type ReviewSummary = {
  total: number;
  cumple: number;
  noCumple: number;
  pendientes: number;
};

export type ReviewArchiveLike = {
  estadoRevision?: string | null;
  revisadoAt?: Date | null;
  syncStatus?: string | null;
  tallyFileUrl?: string | null;
};

export type ReplacementLike = {
  replacedAt: Date;
} | null | undefined;

export function limitWords(value: string | null | undefined, maxWords = 20) {
  return (value || '').trim().split(/\s+/).filter(Boolean).slice(0, maxWords).join(' ') || null;
}

export function isCorrectionPending(replacement: ReplacementLike, archive: ReviewArchiveLike | null | undefined) {
  if (!replacement) return false;
  if (!archive) return true;
  if (archive.estadoRevision === 'pendiente') return true;
  return archive.estadoRevision === 'no_cumple' && (!archive.revisadoAt || replacement.replacedAt > archive.revisadoAt);
}

export function reviewStatusFromArchive(archive: ReviewArchiveLike | null | undefined, correctionPending = false): EvidenceReviewStatus {
  if (correctionPending) return 'pendiente';
  return archive?.estadoRevision === 'cumple'
    ? 'cumple'
    : archive?.estadoRevision === 'no_cumple'
      ? 'no_cumple'
      : 'pendiente';
}

export function createReviewSummary(): ReviewSummary {
  return { total: 0, cumple: 0, noCumple: 0, pendientes: 0 };
}

export function addReviewToSummary(summary: ReviewSummary, status: EvidenceReviewStatus) {
  summary.total += 1;
  if (status === 'cumple') summary.cumple += 1;
  else if (status === 'no_cumple') summary.noCumple += 1;
  else summary.pendientes += 1;
  return summary;
}

export function addArchiveReviewToSummary(summary: ReviewSummary, archive: ReviewArchiveLike | null | undefined) {
  return addReviewToSummary(summary, reviewStatusFromArchive(archive));
}
