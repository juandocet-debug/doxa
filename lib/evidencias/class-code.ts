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

function baseChar(value: number | null, fallback: string, defaultChar: string) {
  if (value !== null && Number.isFinite(value)) {
    return ALPHABET[value % ALPHABET.length] ?? defaultChar;
  }
  return clean(fallback)[0] ?? defaultChar;
}

function randomTail(size: number) {
  const bytes = randomBytes(size);
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}

function codeCandidate(ref: ClassCodeIdentity) {
  const componentChar = clean(ref.componenteNombre || ref.componenteId)[0] ?? 'X';
  const groupChar = baseChar(firstNumber(ref.grupo), ref.grupo, 'G');
  const classChar = baseChar(firstNumber(ref.clase), ref.clase, 'C');
  return `${componentChar}${groupChar}${classChar}${randomTail(2)}`.slice(0, 5);
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
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await prisma.tallyClassCode.create({
        data: { ...ref, code: codeCandidate(ref) },
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
  if (existing) return existing.code;
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
    codes.set(classCodeMapKey(row), row.code);
  }
  for (const identity of identities) {
    if (codes.has(classCodeMapKey(identity))) continue;
    const row = await createClassCode(identity);
    codes.set(classCodeMapKey(identity), row.code);
  }
  return codes;
}
