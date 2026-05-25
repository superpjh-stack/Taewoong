import postgres from 'postgres'

const DATABASE_URL = process.env['DATABASE_URL']
if (!DATABASE_URL) throw new Error('DATABASE_URL is required')

export const sql = postgres(DATABASE_URL, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  transform: postgres.camel,   // snake_case DB → camelCase JS (선택적)
  types: {
    // TIMESTAMPTZ → JS Date
    1184: { to: 0, from: [1184], parse: (v: string) => new Date(v) },
  },
  onnotice: () => {},           // TimescaleDB NOTICE 메시지 억제
})

// PostgreSQL 연결 헬스체크
export async function checkDbConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`
    return true
  } catch {
    return false
  }
}

// 트랜잭션 헬퍼 타입
export type Sql = typeof sql
export type Transaction = Parameters<Parameters<typeof sql.begin>[0]>[0]
