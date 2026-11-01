import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadOwnerAuth } from './owner-auth'

const central = vi.hoisted(() => ({ accessToken: vi.fn(), logout: vi.fn(), create: vi.fn() }))
vi.mock('@orbis-admin/contracts', () => ({ createCustomerSessionClient: central.create }))
const sdk = vi.hoisted(() => ({ getSession: vi.fn(), signInWithOAuth: vi.fn(), signOut: vi.fn(), stopAutoRefresh: vi.fn(), createClient: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: sdk.createClient }))
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); vi.resetAllMocks() })
const configure = () => {
  central.create.mockReturnValue(central); central.accessToken.mockResolvedValue(null); central.logout.mockResolvedValue(undefined)
  vi.stubGlobal('window', { location: { origin: 'https://admin.example', pathname: '/operations', assign: vi.fn() } })
  sdk.createClient.mockReturnValue({ auth: sdk })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ origin: 'https://aqcwhqdzniruvoqwfsij.supabase.co', publishableKey: 'public' })))
}
describe('owner central session with legacy compatibility', () => {
  it('restores a tab-scoped session and supports login/logout/disposal', async () => {
    configure()
    sdk.getSession.mockResolvedValue({ data: { session: { access_token: 'private' } }, error: null })
    sdk.signInWithOAuth.mockResolvedValue({ error: null }); sdk.signOut.mockResolvedValue({ error: null })
    const auth = (await loadOwnerAuth())!
    expect(await auth.token()).toBe('private')
    expect(sdk.createClient.mock.calls[0][2].auth).toMatchObject({ flowType: 'pkce', storage: sessionStorage, storageKey: 'orbis-admin-owner-session' })
    await auth.login(); await auth.logout(); auth.dispose()
    expect(window.location.assign).toHaveBeenCalledWith('/account?returnTo=%2Foperations')
    expect(sdk.signInWithOAuth).not.toHaveBeenCalled()
    expect(central.logout).toHaveBeenCalledOnce()
    expect(sdk.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(sdk.stopAutoRefresh).toHaveBeenCalled()
  })
  it('handles no saved session and SDK failures', async () => {
    configure(); const auth = (await loadOwnerAuth())!
    sdk.getSession.mockResolvedValueOnce({ data: { session: null }, error: null }).mockResolvedValueOnce({ error: 'private' })
    expect(await auth.token()).toBeNull()
    await expect(auth.token()).rejects.toThrow('Owner session unavailable')
    sdk.signOut.mockResolvedValue({ error: 'private' })
    await expect(auth.logout()).rejects.toThrow('Owner logout unavailable')
  })
  it('prefers the shared central token and does not fall back after a central failure', async () => {
    configure(); const auth = (await loadOwnerAuth())!
    central.accessToken.mockResolvedValueOnce('central-owner')
    expect(await auth.token()).toBe('central-owner');expect(sdk.getSession).not.toHaveBeenCalled()
    central.accessToken.mockRejectedValueOnce(new Error('offline'))
    await expect(auth.token()).rejects.toThrow('offline');expect(sdk.getSession).not.toHaveBeenCalled()
  })
  it('attempts both signouts even if either store reports failure', async () => {
    configure(); const auth = (await loadOwnerAuth())!
    central.logout.mockRejectedValueOnce(new Error('offline'));sdk.signOut.mockResolvedValue({error:null})
    await expect(auth.logout()).rejects.toThrow('Owner logout unavailable');expect(sdk.signOut).toHaveBeenCalledOnce()
    sdk.signOut.mockRejectedValueOnce(new Error('legacy failed'))
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
