import { afterEach, expect, it, vi } from 'vitest'
import { createCustomerSessionClient } from './customer-session'
const customer = { orbisIdentityId: '11111111-1111-7111-8111-111111111111', displayId: 'ORB-U-23456789' }
const response = { version: 'orbis.customer.v1', customer, session: { accessToken: 'access', refreshToken: 'refresh', expiresIn: 3600 } }
function storage() { return { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn(), removeItem: vi.fn() } }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes }); return { promise, resolve } }
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
it('cancels a pending refresh after logout without persisting the returned tokens', async () => {
  const pending = deferred<Response>(), store = storage()
  const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json({ ...response, session: { ...response.session, expiresIn: 1 } })).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(Response.json({ signedOut: true }))
  const client = createCustomerSessionClient({ baseUrl: 'https://admin.example', storage: store, fetchImpl })
  await client.authenticate('login', { identifier: 'a@b.co', password: 'password' }); store.setItem.mockClear()
  const result = client.restore(); await client.logout(); pending.resolve(Response.json(response))
  await expect(result).rejects.toMatchObject({ code: 'CUSTOMER_OPERATION_CANCELLED' })
  expect(client.snapshot()).toBeNull(); expect(store.setItem).not.toHaveBeenCalled()
})
it('does not erase a newer login when an older verification request returns unauthorized', async () => {
  const pending = deferred<Response>(), store = storage()
  const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json(response)).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(Response.json({ signedOut: true })).mockResolvedValueOnce(Response.json(response))
  const client = createCustomerSessionClient({ baseUrl: 'https://admin.example', storage: store, fetchImpl })
  await client.authenticate('login', { identifier: 'a@b.co', password: 'password' })
  const result = client.restore(); await client.logout()
  await client.authenticate('login', { identifier: 'a@b.co', password: 'new-password' }); store.removeItem.mockClear()
  pending.resolve(new Response('{}', { status: 401 }))
  await expect(result).rejects.toMatchObject({ code: 'CUSTOMER_LOGIN_REQUIRED' })
  expect(client.snapshot()?.accessToken).toBe('access'); expect(store.removeItem).not.toHaveBeenCalled()
})
