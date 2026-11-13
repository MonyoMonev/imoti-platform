import 'server-only';
import path from 'node:path';
import fs from 'node:fs';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';

// Един и същ SQL навсякъде. Без DATABASE_URL работим върху PGlite (Postgres в процеса,
// данните са в .data/pg). С DATABASE_URL се връзваме към истински Postgres.

type Client = {
  query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
  exec: (sql: string) => Promise<void>;
  kind: 'pglite' | 'pg';
};

const g = globalThis as any;

async function seedIfEmpty(client: Client) {
  const seeded = await client.query(`select value from settings where key = 'seeded'`);
  if (seeded.rows.length === 0) {
    const { seed } = await import('./seed');
    await seed(client);
    await client.query(
      `insert into settings (key, value) values ('seeded', $1::jsonb) on conflict (key) do nothing`,
      [JSON.stringify({ at: new Date().toISOString() })]
    );
  }
  await client.query(
    `insert into settings (key, value) values ('schema', $1::jsonb) on conflict (key) do update set value = excluded.value`,
    [JSON.stringify(SCHEMA_VERSION)]
  );
}

async function connectPg(): Promise<Client> {
  const pgm: any = await import('pg');
  const { Pool, types } = pgm.default ?? pgm;
  // count(*) и bigint идват като числа, както при PGlite. numeric остава текст и на двете места.
  types.setTypeParser(20, (v: string) => {
    const n = Number(v);
    return Number.isSafeInteger(n) ? n : v;
  });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'off' ? undefined : { rejectUnauthorized: false },
    max: Number(process.env.DATABASE_POOL || 4),
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 15000,
  });
  pool.on('error', () => {});
  const client: Client = {
    kind: 'pg',
    query: (sql, params) => pool.query(sql, params) as any,
    exec: async (sql) => {
      await pool.query(sql);
    },
  };

  // Бърза проверка: ако базата вече е подготвена за тази версия на схемата, не правим нищо.
  let ready = false;
  try {
    const r = await pool.query(`select key, value from settings where key in ('seeded','schema')`);
    const schema = r.rows.find((x: any) => x.key === 'schema')?.value;
    ready = r.rows.some((x: any) => x.key === 'seeded') && Number(schema) === SCHEMA_VERSION;
  } catch {
    ready = false;
  }
  if (!ready) {
    // Създаването на таблиците и началните данни става в една транзакция с ключалка,
    // за да не се засекат два сървъра, които тръгват едновременно.
    const c = await pool.connect();
    try {
      await c.query('begin');
      await c.query('select pg_advisory_xact_lock(727274001)');
      await c.query(SCHEMA_SQL);
      await seedIfEmpty({
        kind: 'pg',
        query: (sql, params) => c.query(sql, params) as any,
        exec: async (sql) => {
          await c.query(sql);
        },
      });
      await c.query('commit');
    } catch (e) {
      await c.query('rollback').catch(() => {});
      throw e;
    } finally {
      c.release();
    }
  }
  return client;
}

async function connectPglite(): Promise<Client> {
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = process.env.PGLITE_DIR || path.join(process.cwd(), '.data', 'pg');
  fs.mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir);
  await pg.waitReady;
  const client: Client = {
    kind: 'pglite',
    query: (sql, params) => pg.query(sql, params) as any,
    exec: async (sql) => {
      await pg.exec(sql);
    },
  };
  await client.exec(SCHEMA_SQL);
  await seedIfEmpty(client);
  return client;
}

function db(): Promise<Client> {
  if (!g.__imotiDb) {
    g.__imotiDb = (process.env.DATABASE_URL ? connectPg() : connectPglite()).catch((e: any) => {
      g.__imotiDb = null;
      throw e;
    });
  }
  return g.__imotiDb;
}

/** Връща редовете от заявката. */
export async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const c = await db();
  const r = await c.query(sql, params);
  return r.rows as T[];
}

/** Връща първия ред или null. */
export async function q1<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await q<T>(sql, params);
  return rows[0] ?? null;
}

export type SeedClient = Client;
