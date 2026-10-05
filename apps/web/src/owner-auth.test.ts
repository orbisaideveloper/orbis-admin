import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadOwnerAuth } from './owner-auth'

const sdk = vi.hoisted(() => ({ getSession: vi.fn(), signInWithOAuth: vi.fn(), signOut: vi.fn(), stopAutoRefresh: vi.fn(), createClient: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: sdk.createClient }))
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })
const configure = () => {
  sdk.createClient.mockReturnValue({ auth: sdk })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ origin: 'https://aqcwhqdzniruvoqwfsij.supabase.co', publishableKey: 'public' })))
}
describe('owner Google PKCE session', () => {
  it('restores a tab-scoped session and supports login/logout/disposal', async () => {
    configure()
    sdk.getSession.mockResolvedValue({ data: { session: { access_token: 'private' } }, error: null })
    sdk.signInWithOAuth.mockResolvedValue({ error: null }); sdk.signOut.mockResolvedValue({ error: null })
    const auth = (await loadOwnerAuth())!
    expect(await auth.token()).toBe('private')
    expect(sdk.createClient.mock.calls[0][2].auth).toMatchObject({ flowType: 'pkce', storage: sessionStorage, storageKey: 'orbis-admin-owner-session' })
    await auth.login(); await auth.logout(); auth.dispose()
    expect(sdk.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'http://localhost/' } })
    expect(sdk.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(sdk.stopAutoRefresh).toHaveBeenCalled()
  })
  it('handles no saved session and SDK failures', async () => {
    configure(); const auth = (await loadOwnerAuth())!
    sdk.getSession.mockResolvedValueOnce({ data: { session: null }, error: null }).mockResolvedValueOnce({ error: 'private' })
    expect(await auth.token()).toBeNull()
    await expect(auth.token()).rejects.toThrow('Owner session unavailable')
    sdk.signInWithOAuth.mockResolvedValue({ error: 'private' }); sdk.signOut.mockResolvedValue({ error: 'private' })
    await expect(auth.login()).rejects.toThrow('Owner login unavailable')
    await expect(auth.logout()).rejects.toThrow('Owner logout unavailable')
  })
  it('does not initialize authentication when unconfigured or offline', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(null)).mockResolvedValueOnce(new Response('', { status: 503 }))
    vi.stubGlobal('fetch', fetcher)
    expect(await loadOwnerAuth()).toBeNull()
    await expect(loadOwnerAuth()).rejects.toThrow('Owner login unavailable')
  })
  it.each([{ origin: 'https://untrusted.example', publishableKey: 'public' }, {}, 'bad', { origin: 'x' }, { origin: 1, publishableKey: 'x' }, { origin: 'x', publishableKey: 1 }])('rejects malformed configuration %j', async (config) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(config)))
    await expect(loadOwnerAuth()).rejects.toThrow('Invalid owner login configuration')
  })
})
