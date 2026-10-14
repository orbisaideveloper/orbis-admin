import { directoryResult } from './directory.js'
import type { OwnerBinding } from '../security/owner.js'
import { profileInput, profileResult } from './profile.js'
import { CustomerError } from './error.js'
import { productScope, productBinding } from './product.js'
import { customerInput, passwordCredentials } from './input.js'

const AUTHORITY = 'https://aqcwhqdzniruvoqwfsij.supabase.co'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const identity = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
export { CustomerError } from './error.js'
type ObjectValue = Record<string, unknown>
function record(value: unknown): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CustomerError(503, 'CUSTOMER_SERVICE_UNAVAILABLE')
  return value as ObjectValue
}
export type CustomerServiceOptions = {
  enabled?: boolean; origin?: string; publicKey?: string; serviceKey?: string; fetchImpl?: typeof fetch
}
export function createCustomerService(options: CustomerServiceOptions) {
  const request = async (path: string, key: string, body?: unknown, bearer?: string) => {
    const response = await (options.fetchImpl ?? fetch)(AUTHORITY + path, {
      method: body === undefined ? 'GET' : 'POST', redirect: 'error',
      headers: { apikey: key, authorization: `Bearer ${bearer ?? key}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      if (response.status === 429) throw new CustomerError(429, 'CUSTOMER_RATE_LIMITED')
      if (response.status === 400 || response.status === 401 || response.status === 422) throw new CustomerError(401, 'CUSTOMER_AUTH_FAILED')
      throw new CustomerError(503, 'CUSTOMER_SERVICE_UNAVAILABLE')
    }
    const text = await response.text()
    if (text.length > 65_536) throw new CustomerError(503, 'CUSTOMER_SERVICE_UNAVAILABLE')
    return JSON.parse(text) as unknown
  }
  const ready = () => {
    if (!options.enabled || options.origin !== AUTHORITY || !options.publicKey || !options.serviceKey) {
      throw new CustomerError(503, 'CUSTOMER_AUTH_NOT_CONFIGURED')
    }
  }
  const verify = async (accessToken: string) => {
    if (!accessToken || accessToken.length > 8192) throw new CustomerError(401, 'CUSTOMER_LOGIN_REQUIRED')
    const user = record(await request('/auth/v1/user', options.publicKey!, undefined, accessToken))
    if (typeof user.id !== 'string' || !uuid.test(user.id)) throw new CustomerError(401, 'CUSTOMER_LOGIN_REQUIRED')
    let claims: ObjectValue
    try { claims = record(JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString())) } catch {
      throw new CustomerError(401, 'CUSTOMER_LOGIN_REQUIRED')
    }
    if (claims.sub !== user.id || claims.iss !== AUTHORITY + '/auth/v1' || claims.role !== 'authenticated' ||
        typeof claims.session_id !== 'string' || !uuid.test(claims.session_id)) throw new CustomerError(401, 'CUSTOMER_LOGIN_REQUIRED')
    return { ...user, id: user.id, session_id: claims.session_id,
      email: typeof user.email === 'string' ? user.email : null,
      phone: typeof user.phone === 'string' ? user.phone : null }
  }
  const account = async (user: ObjectValue) => {
    // Auth metadata can supply a display name; it never supplies IDs, roles or access.
    const metadata = record(user.user_metadata ?? {})
    const result = record(await request('/rest/v1/rpc/orbis_customer_bootstrap', options.serviceKey!, {
      p_auth_user_id: user.id,
      p_session_id: user.session_id,
      p_name: typeof metadata.display_name === 'string' ? metadata.display_name.slice(0, 120) : 'Orbis customer',
    }))
    if (typeof result.orbisIdentityId !== 'string' || !identity.test(result.orbisIdentityId) ||
        typeof result.displayId !== 'string' || !/^ORB-U-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/u.test(result.displayId)) {
      throw new CustomerError(503, 'CUSTOMER_IDENTITY_UNAVAILABLE')
    }
    return { orbisIdentityId: result.orbisIdentityId, displayId: result.displayId }
  }
  const sessionResult = async (value: unknown) => {
    const session = record(value)
    if (typeof session.access_token !== 'string' || typeof session.refresh_token !== 'string' ||
        !session.refresh_token || typeof session.expires_in !== 'number' ||
        !Number.isFinite(session.expires_in) || session.expires_in <= 0) {
      throw new CustomerError(503, 'CUSTOMER_SESSION_UNAVAILABLE')
    }
    const user = await verify(session.access_token)
    const customer = await account(user)
    return { version: 'orbis.customer.v1', customer,
      session: { accessToken: session.access_token, refreshToken: session.refresh_token, expiresIn: session.expires_in } }
  }
  return {
    available() { return Boolean(options.enabled && options.origin === AUTHORITY && options.publicKey && options.serviceKey) },
    async authenticate(body: unknown, signup: boolean) {
      ready()
      const input = customerInput(body, signup)
      const credentials = input && passwordCredentials(input)
      if (!input || !credentials) throw new CustomerError(400, 'CUSTOMER_INPUT_INVALID')
      if (signup) {
        const settings = record(await request('/auth/v1/settings', options.publicKey!))
        const external = record(settings.external)
        const phone = 'phone' in credentials
        if (settings.disable_signup === true || external[phone ? 'phone' : 'email'] !== true || settings[phone ? 'phone_autoconfirm' : 'mailer_autoconfirm'] !== true) {
          throw new CustomerError(503, 'CUSTOMER_PASSWORD_SIGNUP_NOT_READY')
        }
      }
      return sessionResult(await request(signup ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password',
        options.publicKey!, { ...credentials, ...(signup ? { data: { display_name: input.name } } : {}) }))
    },
    async refresh(body: unknown) {
      ready()
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new CustomerError(400, 'CUSTOMER_INPUT_INVALID')
      const input = body as ObjectValue
      if (Object.keys(input).length !== 1 || typeof input.refreshToken !== 'string' ||
          !input.refreshToken || input.refreshToken.length > 8192) throw new CustomerError(400, 'CUSTOMER_INPUT_INVALID')
      return sessionResult(await request('/auth/v1/token?grant_type=refresh_token', options.publicKey!, { refresh_token: input.refreshToken }))
    },
    async directory(owner: OwnerBinding, cursor: string | null) {
      ready()
      return directoryResult(await request('/rest/v1/rpc/orbis_customer_directory', options.serviceKey!, {
        p_auth_user_id: owner.authUserId, p_session_id: owner.sessionId, p_after: cursor,
      }))
    },
    async profile(accessToken: string, patch?: unknown) {
      ready()
      const changes = patch === undefined ? null : profileInput(patch)
      const user = await verify(accessToken)
      const customer = await account(user)
      const value = await request('/rest/v1/rpc/orbis_customer_profile', options.serviceKey!, {
        p_auth_user_id: user.id, p_session_id: user.session_id, p_patch: changes,
      })
      return { version: 'orbis.customer.profile.v1', customer, profile: profileResult(value),
        contact: { email: typeof user.email === 'string' ? user.email : null, phone: typeof user.phone === 'string' ? user.phone : null } }
    },
    async product(accessToken: string, project: string, environment: string) {
      ready()
      const scope = productScope(project, environment)
      const user = await verify(accessToken)
      const customer = await account(user)
      const value = await request('/rest/v1/rpc/orbis_customer_product_binding', options.serviceKey!, {
        p_auth_user_id: user.id, p_session_id: user.session_id,
        p_project_id: scope.projectId, p_environment: scope.environment,
      })
      return productBinding(value, { ...scope, orbisIdentityId: customer.orbisIdentityId })
    },
    async current(accessToken: string) { ready(); return { version: 'orbis.customer.v1', customer: await account(await verify(accessToken)) } },
    async logout(accessToken: string) {
      ready(); await verify(accessToken)
      // Supabase logout returns an empty response, so do not parse it as JSON.
      const response = await (options.fetchImpl ?? fetch)(AUTHORITY + '/auth/v1/logout?scope=local', {
        method: 'POST', redirect: 'error', headers: { apikey: options.publicKey!, authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) throw new CustomerError(503, 'CUSTOMER_SERVICE_UNAVAILABLE')
      return { signedOut: true }
    },
  }
}
