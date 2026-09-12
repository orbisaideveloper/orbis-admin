import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

const migrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../database/migrations/20260912150000_identity_foundation.sql',
)

let migration = ''

beforeAll(async () => {
  migration = await readFile(migrationPath, 'utf8')
})

describe('identity foundation migration contract', () => {
  it('creates the private identity tables and canonical constraints', () => {
    expect(migration).toContain('create schema if not exists orbis_identity;')
    expect(migration).toContain('create table orbis_identity.identities')
    expect(migration).toContain('create table orbis_identity.identifiers')
    expect(migration).toContain('create table orbis_identity.product_references')
    expect(migration).toContain('create table orbis_identity.merge_records')
    expect(migration).toContain("subject_kind in ('person', 'organization')")
    expect(migration).toContain("lifecycle in ('provisional', 'active', 'suspended', 'merged')")
  })

  it('keeps observed conflicts while enforcing one active verified owner', () => {
    expect(migration).toContain('identifiers_active_lookup_idx')
    expect(migration).toContain('identifiers_verified_active_unique_idx')
    expect(migration).toContain("where assurance = 'verified' and revoked_at is null")
  })

  it('indexes every identity foreign-key access path', () => {
    expect(migration).toContain('identifiers_identity_id_idx')
    expect(migration).toContain('product_references_identity_id_idx')
    expect(migration).toContain('merge_records_source_identity_idx')
    expect(migration).toContain('merge_records_target_identity_idx')
  })

  it('uses fail-closed access and append-only merge evidence', () => {
    expect(migration.match(/enable row level security;/gu)).toHaveLength(4)
    expect(migration.match(/force row level security;/gu)).toHaveLength(4)
    expect(migration).toContain('revoke all on schema orbis_identity from public;')
    expect(migration).toContain('merge_records_append_only')
    expect(migration).not.toContain('grant all')
    expect(migration).not.toContain('on delete cascade')
  })

  it('runs as one explicit transaction', () => {
    expect(migration.startsWith('begin;\n')).toBe(true)
    expect(migration.endsWith('\ncommit;\n')).toBe(true)
  })
})
