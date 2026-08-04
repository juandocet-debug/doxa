import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export interface ClassCodeRef {
  formId: string;
  componenteId: string;
  componenteNombre?: string | null;
  grupo: string;
  clase: string;
}

type ClassCodeIdentity = ClassCodeRef & {
  grupoKey: string;
  claseKey: string;
};

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STOPWORDS = new Set(['A', 'DE', 'DEL', 'EL', 'LA', 'LAS', 'LOS', 'POR', 'PARA', 'Y']);

function clean(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

function firstNumber(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function numberPart(value: string, prefix: string) {
  const num = firstNumber(value);
  if (num !== null && Number.isFinite(num)) return `${prefix}${String(num).padStart(2, '0')}`;
  const fallback = clean(value).slice(0, 2) || '00';
  return `${prefix}${fallback}`;
}

function componentPrefix(value: string | null | undefined, size = 2) {
  const cleanedWords = (value || '')
    .split(/\s+/)
    .map(clean)
    .filter(word => word && !STOPWORDS.has(word));
  const firstWord = cleanedWords[0] || clean(value || '');
  if (firstWord.length >= size) return firstWord.slice(0, size);
  return (cleanedWords.map(word => word[0]).join('') || firstWord || 'XX').slice(0, size).padEnd(size, 'X');
}

function randomTail(size: number) {
  const bytes = randomBytes(size);
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}

function codeCandidates(ref: ClassCodeIdentity) {
  const semantic = `${componentPrefix(ref.componenteNombre || ref.componenteId)}${numberPart(ref.grupo, 'G')}${numberPart(ref.clase, 'C')}`;
  const expanded = `${componentPrefix(ref.componenteNombre || ref.componenteId, 3)}${numberPart(ref.grupo, 'G')}${numberPart(ref.clase, 'C')}`;
  const idFallback = `${componentPrefix(ref.componenteNombre || ref.componenteId)}${clean(ref.componenteId).slice(-2)}${numberPart(ref.grupo, 'G')}${numberPart(ref.clase, 'C')}`;
  return Array.from(new Set([semantic, expanded, idFallback]));
}

export function classCodeIdentity(ref: ClassCodeRef): ClassCodeIdentity {
  const grupoNum = firstNumber(ref.grupo);
  const claseNum = firstNumber(ref.clase);
  return {
    ...ref,
    grupo: ref.grupo || 'Sin grupo',
    clase: ref.clase || 'Sin clase',
    grupoKey: grupoNum !== null ? `G${grupoNum}` : clean(ref.grupo || 'Sin grupo').slice(0, 32),
    claseKey: claseNum !== null ? `C${claseNum}` : clean(ref.clase || 'Sin clase').slice(0, 32),
  };
}

export function classCodeMapKey(ref: ClassCodeIdentity) {
  return [ref.formId, ref.componenteId, ref.grupoKey, ref.claseKey].join('::');
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function createClassCode(ref: ClassCodeIdentity) {
  const candidates = codeCandidates(ref);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await prisma.tallyClassCode.create({
        data: { ...ref, code: candidates[attempt] ?? `${candidates[0]}${randomTail(2)}` },
      });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const existing = await prisma.tallyClassCode.findUnique({
        where: {
          formId_componenteId_grupoKey_claseKey: {
            formId: ref.formId,
            componenteId: ref.componenteId,
            grupoKey: ref.grupoKey,
            claseKey: ref.claseKey,
          },
        },
      });
      if (existing) return existing;
    }
  }
  throw new Error('No se pudo generar un codigo unico de clase.');
}

async function alignExistingClassCode(ref: ClassCodeIdentity, current: { id: string; code: string }) {
  if (codeCandidates(ref).includes(current.code)) return current.code;
  for (const code of codeCandidates(ref)) {
    try {
      return (await prisma.tallyClassCode.update({
        where: { id: current.id },
        data: { code, grupo: ref.grupo, clase: ref.clase, componenteNombre: ref.componenteNombre },
      })).code;
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
    }
  }
  return current.code;
}

export async function ensureClassCode(ref: ClassCodeRef) {
  const identity = classCodeIdentity(ref);
  const existing = await prisma.tallyClassCode.findUnique({
    where: {
      formId_componenteId_grupoKey_claseKey: {
        formId: identity.formId,
        componenteId: identity.componenteId,
        grupoKey: identity.grupoKey,
        claseKey: identity.claseKey,
      },
    },
  });
  if (existing) return alignExistingClassCode(identity, existing);
  return (await createClassCode(identity)).code;
}

export async function ensureClassCodes(refs: ClassCodeRef[]) {
  const identities = Array.from(new Map(refs.map(ref => {
    const identity = classCodeIdentity(ref);
    return [classCodeMapKey(identity), identity];
  })).values());
  const codes = new Map<string, string>();
  if (identities.length === 0) return codes;

  const existing = await prisma.tallyClassCode.findMany({
    where: {
      OR: identities.map(ref => ({
        formId: ref.formId,
        componenteId: ref.componenteId,
        grupoKey: ref.grupoKey,
        claseKey: ref.claseKey,
      })),
    },
  });

  for (const row of existing) {
    const identity = identities.find(ref => classCodeMapKey(ref) === classCodeMapKey(row));
    codes.set(classCodeMapKey(row), identity ? await alignExistingClassCode(identity, row) : row.code);
  }
  for (const identity of identities) {
    if (codes.has(classCodeMapKey(identity))) continue;
    const row = await createClassCode(identity);
    codes.set(classCodeMapKey(identity), row.code);
  }
  return codes;
}
