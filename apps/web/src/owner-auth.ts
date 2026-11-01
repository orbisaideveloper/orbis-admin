import { createCustomerSessionClient } from '@orbis-admin/contracts'
import { ownerSignInPath } from './owner-navigation'
import { createClient } from '@supabase/supabase-js'

export type OwnerAuth = {
  token: () => Promise<string | null>
  login: () => Promise<void>
  logout: () => Promise<void>
  dispose: () => void
}

const ownerAuthOrigin = 'https://aqcwhqdzniruvoqwfsij.supabase.co'

export const loadOwnerAuth = async (): Promise<OwnerAuth | null> => {
  const response = await fetch('/api/v1/admin/auth-config', { cache: 'no-store',
    signal: AbortSignal.timeout(8_000) })
  if (!response.ok) throw new Error('Owner login unavailable')
  const config: unknown = await response.json()
  if (config === null) return null
  if (!config || typeof config !== 'object' || !('origin' in config) || !('publishableKey' in config) ||
    config.origin !== ownerAuthOrigin || typeof config.publishableKey !== 'string') {
    throw new Error('Invalid owner login configuration')
  }
  const client = createClient(ownerAuthOrigin, config.publishableKey, { auth: {
    flowType: 'pkce', storage: sessionStorage, persistSession: true,
    autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'orbis-admin-owner-session',
  } })
  const central = createCustomerSessionClient({ baseUrl: window.location.origin, storage: localStorage })
  return {
    async token() {
      const centralToken = await central.accessToken()
      if (centralToken) return centralToken
      const { data, error } = await client.auth.getSession()
      if (error) throw new Error('Owner session unavailable')
      return data.session?.access_token ?? null
    },
    login() {
      // The shared account page owns passwords; the API grants owner rights by ID.
      window.location.assign(ownerSignInPath(window.location.pathname))
      return Promise.resolve()
    },
    async logout() {
      // Always clear both current central and legacy tab-scoped session stores.
      const [centralResult, legacyResult] = await Promise.allSettled([
        central.logout(), client.auth.signOut({ scope: 'local' }),
      ])
      if (centralResult.status === 'rejected' || legacyResult.status === 'rejected' || legacyResult.value.error) {
        throw new Error('Owner logout unavailable')
      }
    },
    dispose() { void client.auth.stopAutoRefresh() },
  }
}
