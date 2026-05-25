#!/usr/bin/env node
/**
 * DB Migration Runner
 * Usage: pnpm --filter @taewung/api db:migrate
 *        pnpm --filter @taewung/api db:migrate 006  (특정 파일만)
 *
 * migrations/ 디렉터리의 *.sql 파일을 파일명 정렬 순서대로 실행한다.
 * 적용 이력은 schema_migrations 테이블에 기록하여 재실행 시 중복 적용을 방지한다.
 */
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { sql } from './client.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, 'migrations')

async function ensureMigrationsTable() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
}

async function appliedMigrations(): Promise<Set<string>> {
  const rows = await sql.unsafe<{ filename: string }[]>(
    'SELECT filename FROM schema_migrations'
  )
  return new Set(rows.map((r) => r.filename))
}

async function runMigrations() {
  const filterPrefix = process.argv[2] ?? ''

  await ensureMigrationsTable()
  const done = await appliedMigrations()

  let files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  if (filterPrefix) {
    files = files.filter((f) => f.startsWith(filterPrefix))
  }

  const pending = files.filter((f) => !done.has(f))

  if (pending.length === 0) {
    console.log('\n✅ No pending migrations. Schema is up to date.\n')
    await sql.end()
    return
  }

  console.log(`\n🔧 Applying ${pending.length} migration(s)...\n`)

  for (const file of pending) {
    const filePath = join(MIGRATIONS_DIR, file)
    const content = readFileSync(filePath, 'utf-8')
    try {
      await sql.unsafe(content)
      await sql`INSERT INTO schema_migrations (filename) VALUES (${file})`
      console.log(`  ✅ ${file}`)
    } catch (err) {
      console.error(`  ❌ ${file}`)
      console.error(`     ${(err as Error).message}`)
      process.exit(1)
    }
  }

  console.log('\n✅ Migrations complete.\n')
  await sql.end()
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
