import { createCustomerService, CustomerError, type CustomerServiceOptions } from './service.js'

const authority = 'https://aqcwhqdzniruvoqwfsij.supabase.co'
type Input = Record<string, unknown>
function input(body: unknown, keys: readonly string[]): Input {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).length !== keys.length || Object.keys(body).some(key => !keys.includes(key))) {
    throw new CustomerError(400, 'CUSTOMER_INPUT_INVALID')
  }
  return body as Input
}

function emailShape(value: string): boolean {
  const parts = value.split('@')
  if (parts.length !== 2) return false
  const [local, domain] = parts
  const dot = domain.lastIndexOf('.')
  return /^[^\s@]+$/u.test(local) && /^[^\s@]+$/u.test(domain) && dot > 0 && dot < domain.length - 1
}

export function createCustomerRecovery(options: CustomerServiceOptions,
  central: Pick<ReturnType<typeof createCustomerService>, 'current' | 'refresh'> = createCustomerService(options)) {
  const request = async (path: string, body: unknown, token?: string, method = 'POST') => {
    if (!options.enabled || options.origin !== authority || !options.publicKey || !options.serviceKey) {
      throw new CustomerError(503, 'CUSTOMER_AUTH_NOT_CONFIGURED')
    }
    const response = await (options.fetchImpl ?? fetch)(authority + path, {
      method, redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { apikey: options.publicKey, authorization: `Bearer ${token ?? options.publicKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      if (response.status === 429) throw new CustomerError(429, 'CUSTOMER_RATE_LIMITED')
      throw new CustomerError(response.status >= 500 ? 503 : 401, 'CUSTOMER_RECOVERY_FAILED')
    }
    const text = await response.text()
    if (text.length > 65536) throw new CustomerError(503, 'CUSTOMER_SERVICE_UNAVAILABLE')
    return text ? JSON.parse(text) as unknown : {}
  }
  return {
    async recover(body: unknown, allowedOrigins: readonly string[]) {
      const value = input(body, ['email', 'redirectTo'])
      if (typeof value.email !== 'string' || value.email.length > 254 || !emailShape(value.email) ||
          typeof value.redirectTo !== 'string') throw new CustomerError(400, 'CUSTOMER_INPUT_INVALID')
      let redirect: URL
      try { redirect = new URL(value.redirectTo) } catch { throw new CustomerError(400, 'CUSTOMER_INPUT_INVALID') }
      if (redirect.protocol !== 'https:' || redirect.username || redirect.password || redirect.pathname !== '/' ||
          redirect.search || redirect.hash || !allowedOrigins.includes(redirect.origin)) {
        throw new CustomerError(400, 'CUSTOMER_RECOVERY_REDIRECT_DENIED')
      }
      redirect.searchParams.set('orbis_recovery', '1')
      await request('/auth/v1/recover?redirect_to=' + encodeURIComponent(redirect.href), { email: value.email.toLowerCase() })
      return { accepted: true }
    },
    async verify(body: unknown) {
      const value = input(body, ['tokenHash'])
      if (typeof value.tokenHash !== 'string' || !/^[A-Za-z0-9_-]{32,256}$/u.test(value.tokenHash)) {
        throw new CustomerError(400, 'CUSTOMER_INPUT_INVALID')
      }
      const result = await request('/auth/v1/verify', { token_hash: value.tokenHash, type: 'recovery' })
      if (!result || typeof result !== 'object' || !('refresh_token' in result) ||
          typeof result.refresh_token !== 'string' || !result.refresh_token || result.refresh_token.length > 8192) {
        throw new CustomerError(503, 'CUSTOMER_SESSION_UNAVAILABLE')
      }
      // Reuse central remote verification and live-session bootstrap; no owner capabilities.
      return central.refresh({ refreshToken: result.refresh_token })
    },
    async password(token: string, body: unknown) {
      const value = input(body, ['password'])
      if (typeof value.password !== 'string' || value.password.length < 8 || value.password.length > 128) {
        throw new CustomerError(400, 'CUSTOMER_INPUT_INVALID')
      }
      // Current verifies the provider token AND its live customer session before mutation.
      await central.current(token)
      await request('/auth/v1/user', { password: value.password }, token, 'PUT')
      return { passwordUpdated: true }
    },
  }
}
