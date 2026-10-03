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
  return {
    async token() {
      const { data, error } = await client.auth.getSession()
      if (error) throw new Error('Owner session unavailable')
      return data.session?.access_token ?? null
    },
    async login() {
      const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
      } })
      if (error) throw new Error('Owner login unavailable')
    },
    async logout() {
      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error) throw new Error('Owner logout unavailable')
    },
    dispose() { void client.auth.stopAutoRefresh() },
  }
}
