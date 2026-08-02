export const REVISION_OBSERVACION_MAX_WORDS = 20;

export function limitWords(value: string, maxWords = REVISION_OBSERVACION_MAX_WORDS) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(' ');
}
