import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

const migrationsDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../database/migrations',
)
const foundationMigrationPath = resolve(
  migrationsDirectory,
  '20260912150000_identity_foundation.sql',
)
const actionGuardsMigrationPath = resolve(
  migrationsDirectory,
  '20260912160000_identity_action_guards.sql',
)

let foundationMigration = ''
let actionGuardsMigration = ''

beforeAll(async () => {
  [foundationMigration, actionGuardsMigration] = await Promise.all([
    readFile(foundationMigrationPath, 'utf8'),
    readFile(actionGuardsMigrationPath, 'utf8'),
  ])
})

describe('identity foundation migration contract', () => {
  it('creates the private identity tables and canonical constraints', () => {
    expect(foundationMigration).toContain(
      'create schema if not exists orbis_identity;',
    )
    expect(foundationMigration).toContain(
      'create table orbis_identity.identities',
    )
    expect(foundationMigration).toContain(
      'create table orbis_identity.identifiers',
    )
    expect(foundationMigration).toContain(
      'create table orbis_identity.product_references',
    )
    expect(foundationMigration).toContain(
      'create table orbis_identity.identity_actions',
    )
    expect(foundationMigration).toContain(
      'create table orbis_identity.identity_audit_events',
    )
    expect(foundationMigration).toContain(
      'create table orbis_identity.merge_records',
    )
    expect(foundationMigration).toContain(
      "subject_kind in ('person', 'organization')",
    )
    expect(foundationMigration).toContain(
      "lifecycle in ('provisional', 'active', 'suspended', 'merged')",
    )
    expect(foundationMigration).toContain(
      'identities_display_id_subject_kind_check',
    )
  })

  it('keeps observed conflicts while enforcing one active verified owner', () => {
    expect(foundationMigration).toContain('identifiers_active_lookup_idx')
    expect(foundationMigration).toContain(
      'identifiers_verified_active_unique_idx',
    )
    expect(foundationMigration).toContain(
      "where assurance = 'verified' and revoked_at is null",
    )
    expect(foundationMigration).toContain(
      'product_references_active_local_entity_unique_idx',
    )
  })

  it('provides idempotency and append-only evidence for identity writes', () => {
    expect(foundationMigration).toContain(
      'identity_actions_source_idempotency_unique',
    )
    expect(foundationMigration).toContain(
      'identity_audit_events_action_event_unique',
    )
    expect(foundationMigration).toContain(
      'identity_audit_events_append_only',
    )
    expect(foundationMigration).toContain('merge_records_append_only')
    expect(foundationMigration).toContain(
      'a merge requires matching append-only audit evidence',
    )
    expect(actionGuardsMigration).toContain(
      'identity action request context is immutable',
    )
    expect(actionGuardsMigration).toContain(
      'a completed identity action is immutable',
    )
    expect(actionGuardsMigration).toContain(
      'identity_actions_prevent_delete',
    )
  })

  it('prevents destructive deletion and unsafe key reassignment', () => {
    expect(foundationMigration).toContain('identities_prevent_delete')
    expect(foundationMigration).toContain('identifiers_prevent_delete')
    expect(foundationMigration).toContain(
      'product_references_prevent_delete',
    )
    expect(foundationMigration).toContain(
      'identifier ownership and normalized value are immutable',
    )
    expect(foundationMigration).toContain(
      'product reference ownership and local key are immutable',
    )
    expect(foundationMigration).not.toContain('on delete cascade')
  })

  it('sets a private fail-closed baseline before server policies exist', () => {
    expect(
      foundationMigration.match(/enable row level security;/gu),
    ).toHaveLength(6)
    expect(
      foundationMigration.match(/force row level security;/gu),
    ).toHaveLength(6)
    expect(foundationMigration).toContain(
      'revoke all on schema orbis_identity from public;',
    )
    expect(foundationMigration).toContain(
      'alter default privileges in schema orbis_identity',
    )
    expect(foundationMigration).toContain(
      'revoke all on all functions in schema orbis_identity from public;',
    )
    expect(foundationMigration).not.toContain('grant all')
  })

  it('maintains mutable timestamps through a provider-portable trigger', () => {
    expect(foundationMigration).toContain(
      'create function orbis_identity.set_updated_at()',
    )
    expect(foundationMigration).toContain('identities_set_updated_at')
    expect(foundationMigration).toContain(
      'product_references_set_updated_at',
    )
  })

  it('runs each migration as one explicit transaction', () => {
    expect(foundationMigration.startsWith('begin;\n')).toBe(true)
    expect(foundationMigration.endsWith('\ncommit;\n')).toBe(true)
    expect(actionGuardsMigration.startsWith('begin;\n')).toBe(true)
    expect(actionGuardsMigration.endsWith('\ncommit;\n')).toBe(true)
  })
})
