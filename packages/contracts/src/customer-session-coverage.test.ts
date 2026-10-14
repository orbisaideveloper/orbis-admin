import { afterEach, expect, it, vi } from 'vitest'
import { createCustomerSessionClient } from './customer-session'
const customer = { orbisIdentityId: '11111111-1111-7111-8111-111111111111', displayId: 'ORB-U-23456789' }
const response = { version: 'orbis.customer.v1', customer, session: { accessToken: 'access', refreshToken: 'refresh', expiresIn: 3600 } }
function fixture(raw: string | null = null) {
 const storage = { getItem: vi.fn().mockReturnValue(raw), setItem: vi.fn(), removeItem: vi.fn() }
 return { storage, client: createCustomerSessionClient({ baseUrl: 'https://admin.example', storage }) }
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
it('uses platform fetch and current time without injected adapters', async () => {
 const fetcher = vi.fn().mockResolvedValue(Response.json(response)); vi.stubGlobal('fetch', fetcher)
 const f = fixture(), before = Date.now()
 const session = await f.client.authenticate('login', { identifier: 'a@b.co', password: 'p' })
 expect(session.expiresAt).toBeGreaterThanOrEqual(before + 3600000)
 expect(session.expiresAt).toBeLessThanOrEqual(Date.now() + 3600000)
 expect(fetcher).toHaveBeenCalledOnce()
})
it('clears every malformed logout cache without calling the provider', async () => {
 const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
 for (const raw of ['x'.repeat(20001), 'null', '{}', JSON.stringify({ accessToken: 3 }), JSON.stringify({ accessToken: 'x'.repeat(8193) }), JSON.stringify({ accessToken: '' })]) {
 const f = fixture(raw); await f.client.logout(); expect(f.storage.removeItem).toHaveBeenCalledOnce(); expect(f.client.snapshot()).toBeNull()
 }
 expect(fetcher).not.toHaveBeenCalled()
})
it('rejects malformed remotely verified envelopes and retains cached material', async () => {
 const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
 for (const body of [null, 3, {}, { version: 'bad' }, { version: 'orbis.customer.v1' }, { version: 'orbis.customer.v1', customer: null }]) {
 const f = fixture(JSON.stringify({ version: 1, customer, accessToken: 'access', refreshToken: 'refresh', expiresAt: Date.now() + 3600000 }))
 fetcher.mockResolvedValueOnce(Response.json(body)); await expect(f.client.restore()).rejects.toThrow(); expect(f.storage.removeItem).not.toHaveBeenCalled()
 }
})
