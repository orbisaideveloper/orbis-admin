export type OwnerBinding = {
  authUserId: string
  orbisIdentityId: string
  capabilities: readonly string[]
  sessionId?: string
}

export class OwnerAccessError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code)
  }
}

type OwnerOptions = {
  origin: string
  publishableKey: string
  bindings: readonly OwnerBinding[]
  fetchImpl?: typeof fetch
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const configured = (options: OwnerOptions) =>
  /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(options.origin) &&
  options.publishableKey.length > 0 && options.bindings.length > 0 &&
  options.bindings.every((binding) => uuid.test(binding.authUserId) &&
    uuid.test(binding.orbisIdentityId) && binding.orbisIdentityId[14] === '7') &&
  new Set(options.bindings.map((binding) => binding.authUserId)).size === options.bindings.length

/** Remote verification is per request. Neither email nor editable claims grant access. */
export const createOwnerVerifier = (options: OwnerOptions) => {
  const fetchImpl = options.fetchImpl ?? fetch
  return async (authorization: string | undefined): Promise<OwnerBinding> => {
    if (!configured(options)) throw new OwnerAccessError(503, 'OWNER_NOT_CONFIGURED')
    if (!authorization || !/^Bearer [A-Za-z0-9._-]{20,8192}$/.test(authorization)) {
      throw new OwnerAccessError(401, 'OWNER_LOGIN_REQUIRED')
    }
    let response: Response
    try {
      response = await fetchImpl(`${options.origin}/auth/v1/user`, {
        headers: { apikey: options.publishableKey, authorization },
        redirect: 'error', signal: AbortSignal.timeout(8_000),
      })
    } catch {
      throw new OwnerAccessError(503, 'OWNER_AUTH_UNAVAILABLE')
    }
    if (response.status === 401 || response.status === 403) {
      throw new OwnerAccessError(401, 'OWNER_LOGIN_REQUIRED')
    }
    if (!response.ok) throw new OwnerAccessError(503, 'OWNER_AUTH_UNAVAILABLE')
    let payload: unknown
    try { payload = await response.json() } catch {
      throw new OwnerAccessError(503, 'OWNER_AUTH_UNAVAILABLE')
    }
    if (!payload || typeof payload !== 'object' || !('id' in payload) ||
      typeof payload.id !== 'string' || !uuid.test(payload.id)) {
      throw new OwnerAccessError(503, 'OWNER_AUTH_UNAVAILABLE')
    }
    const binding = options.bindings.find((entry) => entry.authUserId === payload.id)
    if (!binding) throw new OwnerAccessError(403, 'OWNER_ACCESS_DENIED')
    // Decode only after remote JWT verification. The database checks session liveness.
    let claims: unknown
    try { claims = JSON.parse(Buffer.from(authorization.slice(7).split('.')[1], 'base64url').toString()) } catch {
      throw new OwnerAccessError(401, 'OWNER_LOGIN_REQUIRED')
    }
    if (!claims || typeof claims !== 'object' || !('session_id' in claims) ||
      typeof claims.session_id !== 'string' || !uuid.test(claims.session_id)) {
      throw new OwnerAccessError(401, 'OWNER_LOGIN_REQUIRED')
    }
    return { ...binding, sessionId: claims.session_id }
  }
}

export const requireMayaCapability = (
  owner: OwnerBinding, capability: 'audit.read' | 'development.deploy',
  project: string, environment: string,
) => {
  const scope = `orbis-maya:${environment}:${capability}`
  if (project !== 'orbis-maya' || environment !== 'development' ||
    !owner.capabilities.includes(scope)) {
    throw new OwnerAccessError(403, 'OWNER_CAPABILITY_DENIED')
  }
}

/** Every switch must explicitly enable a write; a missing value disables it. */
export const requireMayaWrites = (switches: readonly (string | undefined)[]) => {
  if (switches.length !== 4 || switches.some((value) => value !== 'enabled')) {
    throw new OwnerAccessError(503, 'ADMIN_WRITES_DISABLED')
  }
}
