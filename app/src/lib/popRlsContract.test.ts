import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDir = resolve(import.meta.dirname, '../../supabase/migrations')

function readMigration(name: string): string {
  return readFileSync(resolve(migrationsDir, name), 'utf8')
}

describe('POP RLS contract', () => {
  it('pop_pending_holds has no authenticated INSERT policy', () => {
    const sql = readMigration('20260525220000_pop_pending_holds.sql')
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/i)
    expect(sql).not.toMatch(/FOR INSERT[\s\S]*TO authenticated/i)
    expect(sql).toMatch(/settle_pop_pending_hold/i)
    expect(sql).toMatch(/service_role/i)
  })

  it('settlement v2 keeps appeal columns server-side', () => {
    const sql = readMigration('20260602120000_pop_settlement_v2.sql')
    expect(sql).toContain('release_eligible_at')
    expect(sql).toContain('appeal_expires_at')
    expect(sql).not.toMatch(/GRANT EXECUTE[\s\S]*TO authenticated/i)
  })

  it('pops_sessions is service-role write only', () => {
    const sql = readMigration('20260529120000_pops_sessions.sql')
    expect(sql).toMatch(/service_role/)
    expect(sql).not.toMatch(/FOR INSERT[\s\S]*authenticated/i)
  })
})
