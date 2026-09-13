import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../',
)
const migrationPath = resolve(
  repositoryRoot,
  'database/migrations/20260913100000_identity_write_api.sql',
)
const concurrencyMigrationPath = resolve(
  repositoryRoot,
  'database/migrations/20260913101000_identity_write_api_concurrency.sql',
)
const edgeFunctionPath = resolve(
  repositoryRoot,
  'supabase/functions/orbis-identity-write/index.ts',
)

let migration = ''
let concurrencyMigration = ''
let edgeFunction = ''

beforeAll(async () => {
  ;[migration, concurrencyMigration, edgeFunction] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile(concurrencyMigrationPath, 'utf8'),
    readFile(edgeFunctionPath, 'utf8'),
  ])
})

describe('identity write API contract', () => {
  it('adds durable idempotency state and hashed service credentials', () => {
    expect(migration).toContain('add column request_fingerprint text not null')
    expect(migration).toContain('add column result jsonb')
    expect(migration).toContain('create table orbis_identity.service_keys')
    expect(migration).toContain("check (key_hash ~ '^[0-9a-f]{64}$')")
    expect(migration).toContain('service_keys_prevent_delete')
  })

  it('keeps identity writes atomic and auditable', () => {
    expect(migration).toContain(
      'create function orbis_identity.resolve_observation_write(',
    )
    expect(migration).toContain('pg_advisory_xact_lock')
    expect(migration).toContain("'identity_created'")
    expect(migration).toContain("'identifier_linked'")
    expect(migration).toContain("'product_reference_linked'")
    expect(migration).toContain("status = 'completed'")
    expect(migration).toContain("status = 'review_required'")
  })

  it('serializes concurrent requests with the same idempotency key', () => {
    expect(concurrencyMigration).toContain(
      ') rename to resolve_observation_write_unlocked;',
    )
    expect(concurrencyMigration).toContain('pg_advisory_xact_lock')
    expect(concurrencyMigration).toContain(
      'existing_action.request_fingerprint <> p_request_fingerprint',
    )
    expect(concurrencyMigration).toContain(
      'orbis_identity.resolve_observation_write_unlocked(',
    )
  })

  it('keeps the service-key table private and fail closed', () => {
    expect(migration).toContain(
      'alter table orbis_identity.service_keys\n  enable row level security;',
    )
    expect(migration).toContain(
      'alter table orbis_identity.service_keys\n  force row level security;',
    )
    expect(migration).toContain(
      'revoke all on table orbis_identity.service_keys from public;',
    )
    expect(migration).toContain(
      'revoke all on all functions in schema orbis_identity from public;',
    )
  })

  it('uses custom server-to-server authentication before any write', () => {
    expect(edgeFunction).toContain("request.headers.get('x-orbis-service-key')")
    expect(edgeFunction).toContain("return json(401, { error: 'service_key_required' })")
    expect(edgeFunction).toContain('from orbis_identity.service_keys')
    expect(edgeFunction).toContain("return json(403, { error: 'service_key_not_authorized' })")
  })

  it('normalizes identifiers and enforces replay-safe idempotency', () => {
    expect(edgeFunction).toContain('normalizeEmail')
    expect(edgeFunction).toContain('normalizePhone')
    expect(edgeFunction).toContain('requestFingerprint')
    expect(edgeFunction).toContain("return json(409, { error: 'idempotency_conflict' })")
    expect(edgeFunction).toContain('replayed: true')
  })

  it('uses the private database connection without exposing database credentials', () => {
    expect(edgeFunction).toContain("Deno.env.get('SUPABASE_DB_URL')")
    expect(edgeFunction).toContain('prepare: false')
    expect(edgeFunction).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(edgeFunction).not.toContain('SUPABASE_SECRET_KEYS')
  })
})
