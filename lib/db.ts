/* eslint-disable @typescript-eslint/no-require-imports */
import path from 'path';

const { PrismaClient } = require('@prisma/client');

function createPrisma() {
  const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  if (dbUrl.startsWith('file:') || dbUrl.startsWith('sqlite:')) {
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
    const rawPath = dbUrl.replace(/^(file:|sqlite:)/, '');
    const dbPath = path.isAbsolute(rawPath)
      ? rawPath
      : path.resolve(/*turbopackIgnore: true*/ process.cwd(), rawPath);
    const adapter = new PrismaBetterSqlite3({ url: dbPath });
    return new PrismaClient({ adapter });
  }
  const { Pool } = require('pg');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const pool = new Pool({ connectionString: dbUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma: any = g._prisma ?? createPrisma();
if (process.env.NODE_ENV !== 'production') g._prisma = prisma;
