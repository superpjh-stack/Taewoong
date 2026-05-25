#!/usr/bin/env node
/**
 * DB Seed Runner
 * Usage: pnpm --filter @taewung/api db:seed
 *        pnpm --filter @taewung/api db:seed 004  (특정 파일만)
 */
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { sql } from './client.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SEEDS_DIR = join(__dirname, 'seeds')

async function runSeeds() {
  const filterPrefix = process.argv[2] ?? ''

  // 시드 이력 테이블 생성 (마이그레이션과 동일한 패턴)
  await sql`
    CREATE TABLE IF NOT EXISTS seed_history (
      filename   TEXT        PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  const applied = new Set(
    (await sql<{ filename: string }[]>`SELECT filename FROM seed_history`).map(
      (r) => r.filename,
    ),
  )

  let files = readdirSync(SEEDS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  if (filterPrefix) {
    files = files.filter((f) => f.startsWith(filterPrefix))
  }

  const pending = files.filter((f) => !applied.has(f))

  if (pending.length === 0) {
    console.log('\n✅ No pending seeds. All seed files already applied.\n')
    await sql.end()
    return
  }

  console.log(`\n🌱 Running ${pending.length} seed file(s)...\n`)

  for (const file of pending) {
    const filePath = join(SEEDS_DIR, file)
    const content = readFileSync(filePath, 'utf-8')
    try {
      await sql.unsafe(content)
      await sql`INSERT INTO seed_history (filename) VALUES (${file})`
      console.log(`  ✅ ${file}`)
    } catch (err) {
      console.error(`  ❌ ${file}`)
      console.error(`     ${(err as Error).message}`)
      process.exit(1)
    }
  }

  console.log('\n✅ Seed complete.\n')
  await sql.end()
}

runSeeds().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
