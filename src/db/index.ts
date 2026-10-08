import { join } from 'node:path'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

type Db = PgDatabase<PgQueryResultHKT>

const DDL = `
create table if not exists users (
  id serial primary key,
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists attempts (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  category_id text not null,
  mode text not null,
  total_questions integer not null,
  correct_count integer not null,
  duration_ms integer not null,
  completed boolean not null default true,
  local_date text not null,
  created_at timestamptz not null default now()
);
create index if not exists attempts_user_date_idx on attempts (user_id, local_date);
create index if not exists attempts_user_category_idx on attempts (user_id, category_id);
create table if not exists answers (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  attempt_id integer not null references attempts(id) on delete cascade,
  category_id text not null,
  item text not null,
  is_correct boolean not null,
  time_ms integer not null,
  created_at timestamptz not null default now()
);
create index if not exists answers_user_category_item_idx on answers (user_id, category_id, item);
create index if not exists answers_attempt_idx on answers (attempt_id);
create table if not exists preferences (
  user_id integer primary key references users(id) on delete cascade,
  pinned_order text not null default '[]'
);
`

async function initDb(): Promise<Db> {
  const url = process.env.DATABASE_URL

  if (!url) {
    const { PGlite } = await import('@electric-sql/pglite')
    const { drizzle } = await import('drizzle-orm/pglite')
    const client = new PGlite(join(process.cwd(), '.pglite'))
    await client.exec(DDL)
    return drizzle(client) as unknown as Db
  }

  if (url.includes('neon.tech')) {
    const { neon } = await import('@neondatabase/serverless')
    const { drizzle } = await import('drizzle-orm/neon-http')
    return drizzle(neon(url)) as unknown as Db
  }

  const { default: pg } = await import('pg')
  const { drizzle } = await import('drizzle-orm/node-postgres')
  const pool = new pg.Pool({ connectionString: url, max: 5 })
  return drizzle(pool) as unknown as Db
}

const globalForDb = globalThis as unknown as { __mentalMathsDb?: Promise<Db> }

export function getDb(): Promise<Db> {
  globalForDb.__mentalMathsDb ??= initDb().catch((err) => {
    globalForDb.__mentalMathsDb = undefined
    throw err
  })
  return globalForDb.__mentalMathsDb
}
