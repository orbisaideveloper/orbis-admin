import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import postgres from 'npm:postgres@3.4.7'

const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const encoder = new TextEncoder()

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

const compactWhitespace = (value: string) =>
  value.trim().replace(/\s+/gu, ' ')

const normalizeEmail = (value: string) =>
  compactWhitespace(value).toLocaleLowerCase('en-US')

const normalizePhone = (
  value: string,
  defaultCountryCallingCode?: string,
) => {
  const trimmed = value.trim()
  const hasInternationalPrefix = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/gu, '')

  if (!digits) return ''
  if (hasInternationalPrefix || !defaultCountryCallingCode) {
    return hasInternationalPrefix ? `+${digits}` : digits
  }

  const countryDigits = defaultCountryCallingCode.replace(/\D/gu, '')
  const nationalDigits = digits.replace(/^0+/u, '')
  return countryDigits ? `+${countryDigits}${nationalDigits}` : digits
}

const hexDigest = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

const createUuidV7 = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let timestamp = BigInt(Date.now())

  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number(timestamp & 0xffn)
    timestamp >>= 8n
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x70
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = [...bytes]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}

const createDisplayId = (subjectKind: 'person' | 'organization') => {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const prefix = subjectKind === 'person' ? 'ORB-U-' : 'ORB-O-'
  return `${prefix}${[...bytes]
    .map((byte) => alphabet[byte % alphabet.length])
    .join('')}`
}

type RequestBody = {
  sourceProjectId?: unknown
  idempotencyKey?: unknown
  actorReference?: unknown
  subjectKind?: unknown
  displayName?: unknown
  phone?: unknown
  phoneAssurance?: unknown
  phoneCountryCallingCode?: unknown
  email?: unknown
  emailAssurance?: unknown
  source?: {
    projectId?: unknown
    localEntityType?: unknown
    localEntityId?: unknown
    roles?: unknown
  }
}

const text = (value: unknown) =>
  typeof value === 'string' ? compactWhitespace(value) : ''

const assurance = (value: unknown) =>
  value === 'verified' ? 'verified' : 'observed'

const normalizeRequest = (body: RequestBody) => {
  const sourceProjectId = text(body.sourceProjectId)
  const idempotencyKey = text(body.idempotencyKey)
  const actorReference = text(body.actorReference)
  const subjectKind = body.subjectKind
  const displayName = text(body.displayName)
  const sourceProject = text(body.source?.projectId)
  const localEntityType = text(body.source?.localEntityType)
  const localEntityId = text(body.source?.localEntityId)
  const roles = Array.isArray(body.source?.roles)
    ? [...new Set(body.source.roles.map(text).filter(Boolean))].sort()
    : []

  if (
    !sourceProjectId ||
    !idempotencyKey ||
    !actorReference ||
    !displayName ||
    !sourceProject ||
    !localEntityType ||
    !localEntityId ||
    roles.length === 0 ||
    sourceProjectId !== sourceProject ||
    (subjectKind !== 'person' && subjectKind !== 'organization')
  ) {
    throw new Error('invalid_request')
  }

  const identifiers: Array<{
    kind: 'email' | 'phone'
    normalized_value: string
    assurance: 'observed' | 'verified'
  }> = []

  if (typeof body.phone === 'string') {
    const normalized = normalizePhone(
      body.phone,
      typeof body.phoneCountryCallingCode === 'string'
        ? body.phoneCountryCallingCode
        : undefined,
    )
    if (normalized) {
      identifiers.push({
        kind: 'phone',
        normalized_value: normalized,
        assurance: assurance(body.phoneAssurance),
      })
    }
  }

  if (typeof body.email === 'string') {
    const normalized = normalizeEmail(body.email)
    if (normalized) {
      identifiers.push({
        kind: 'email',
        normalized_value: normalized,
        assurance: assurance(body.emailAssurance),
      })
    }
  }

  identifiers.sort((left, right) =>
    `${left.kind}:${left.normalized_value}`.localeCompare(
      `${right.kind}:${right.normalized_value}`,
    ),
  )

  return {
    source_project_id: sourceProjectId,
    idempotency_key: idempotencyKey,
    actor_kind: 'product_service',
    actor_reference: actorReference,
    subject_kind: subjectKind,
    display_name: displayName,
    identifiers,
    source: {
      project_id: sourceProject,
      local_entity_type: localEntityType,
      local_entity_id: localEntityId,
      roles,
    },
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' })
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return json(400, { error: 'json_required' })
  }

  const serviceKey = request.headers.get('x-orbis-service-key')?.trim() ?? ''
  if (!serviceKey) {
    return json(401, { error: 'service_key_required' })
  }

  let normalizedRequest: ReturnType<typeof normalizeRequest>
  try {
    normalizedRequest = normalizeRequest(await request.json() as RequestBody)
  } catch {
    return json(400, { error: 'invalid_request' })
  }

  const databaseUrl = Deno.env.get('SUPABASE_DB_URL')
  if (!databaseUrl) {
    return json(503, { error: 'identity_database_unavailable' })
  }

  const keyHash = await hexDigest(serviceKey)
  const requestFingerprint = await hexDigest(JSON.stringify(normalizedRequest))
  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    idle_timeout: 2,
    connect_timeout: 5,
  })

  try {
    const authorized = await sql<Array<{ project_id: string }>>`
      select project_id
      from orbis_identity.service_keys
      where key_hash = ${keyHash}
        and revoked_at is null
      limit 1
    `

    if (
      authorized.length !== 1 ||
      authorized[0].project_id !== normalizedRequest.source_project_id
    ) {
      return json(403, { error: 'service_key_not_authorized' })
    }

    const existing = await sql<Array<{
      orbis_action_id: string
      request_fingerprint: string
      status: string
      result: unknown
    }>>`
      select
        orbis_action_id,
        request_fingerprint,
        status,
        result
      from orbis_identity.identity_actions
      where source_project_id = ${normalizedRequest.source_project_id}
        and idempotency_key = ${normalizedRequest.idempotency_key}
      limit 1
    `

    if (existing.length === 1) {
      if (existing[0].request_fingerprint !== requestFingerprint) {
        return json(409, { error: 'idempotency_conflict' })
      }

      if (existing[0].status === 'pending' || !existing[0].result) {
        return json(409, { error: 'identity_action_pending' })
      }

      return json(200, {
        ...(existing[0].result as Record<string, unknown>),
        replayed: true,
      })
    }

    const actionId = createUuidV7()
    const newIdentityId = createUuidV7()
    const newDisplayId = createDisplayId(normalizedRequest.subject_kind)

    const rows = await sql<Array<{ result: Record<string, unknown> }>>`
      select orbis_identity.resolve_observation_write(
        ${actionId}::uuid,
        ${sql.json(normalizedRequest)}::jsonb,
        ${requestFingerprint}::text,
        ${newIdentityId}::uuid,
        ${newDisplayId}::text
      ) as result
    `

    const result = rows[0]?.result
    if (!result) {
      return json(500, { error: 'identity_write_failed' })
    }

    return json(
      result.outcome === 'review_required' ? 409 : 200,
      result,
    )
  } catch (error) {
    console.error('identity write failed', error)
    return json(500, { error: 'identity_write_failed' })
  } finally {
    await sql.end({ timeout: 1 })
  }
})
