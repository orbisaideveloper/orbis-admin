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
    expect(migration).toContain(
      'create table orbis_identity.product_references',
    )
    expect(migration).toContain('create table orbis_identity.identity_actions')
    expect(migration).toContain(
      'create table orbis_identity.identity_audit_events',
    )
    expect(migration).toContain('create table orbis_identity.merge_records')
    expect(migration).toContain(
      "subject_kind in ('person', 'organization')",
    )
    expect(migration).toContain(
      "lifecycle in ('provisional', 'active', 'suspended', 'merged')",
    )
    expect(migration).toContain(
      'identities_display_id_subject_kind_check',
    )
  })

  it('keeps observed conflicts while enforcing one active verified owner', () => {
    expect(migration).toContain('identifiers_active_lookup_idx')
    expect(migration).toContain('identifiers_verified_active_unique_idx')
    expect(migration).toContain(
      "where assurance = 'verified' and revoked_at is null",
    )
    expect(migration).toContain(
      'product_references_active_local_entity_unique_idx',
    )
  })

  it('provides idempotency and append-only evidence for identity writes', () => {
    expect(migration).toContain(
      'identity_actions_source_idempotency_unique',
    )
    expect(migration).toContain(
      'identity_audit_events_action_event_unique',
    )
    expect(migration).toContain(
      'identity_audit_events_append_only',
    )
    expect(migration).toContain('merge_records_append_only')
    expect(migration).toContain(
      'a merge requires matching append-only audit evidence',
    )
  })

  it('prevents destructive deletion and unsafe key reassignment', () => {
    expect(migration).toContain('identities_prevent_delete')
    expect(migration).toContain('identifiers_prevent_delete')
    expect(migration).toContain('product_references_prevent_delete')
    expect(migration).toContain(
      'identifier ownership and normalized value are immutable',
    )
    expect(migration).toContain(
      'product reference ownership and local key are immutable',
    )
    expect(migration).not.toContain('on delete cascade')
  })

  it('sets a private fail-closed baseline before server policies exist', () => {
    expect(migration.match(/enable row level security;/gu)).toHaveLength(6)
    expect(migration.match(/force row level security;/gu)).toHaveLength(6)
    expect(migration).toContain(
      'revoke all on schema orbis_identity from public;',
    )
    expect(migration).toContain(
      'alter default privileges in schema orbis_identity',
    )
    expect(migration).toContain(
      'revoke all on all functions in schema orbis_identity from public;',
    )
    expect(migration).not.toContain('grant all')
  })

  it('maintains mutable timestamps through a provider-portable trigger', () => {
    expect(migration).toContain('create function orbis_identity.set_updated_at()')
    expect(migration).toContain('identities_set_updated_at')
    expect(migration).toContain('product_references_set_updated_at')
  })

  it('runs as one explicit transaction', () => {
    expect(migration.startsWith('begin;\n')).toBe(true)
    expect(migration.endsWith('\ncommit;\n')).toBe(true)
  })
})
