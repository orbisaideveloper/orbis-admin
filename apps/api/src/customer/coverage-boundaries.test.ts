import { afterEach, expect, it, vi } from 'vitest'
import { createCustomerService } from './service'
import { createCustomerRecovery } from './recovery'
import { profileInput, profileResult } from './profile'
import { directoryResult } from './directory'
const origin = 'https://aqcwhqdzniruvoqwfsij.supabase.co'
const uid = '11111111-1111-4111-8111-111111111111'
const sid = '33333333-3333-4333-8333-333333333333'
const id = '11111111-1111-7111-8111-111111111111'
const binding = { orbisIdentityId: id, displayId: 'ORB-U-23456789' }
const token = 'h.' + Buffer.from(JSON.stringify({ sub: uid, iss: origin + '/auth/v1', role: 'authenticated', session_id: sid })).toString('base64url') + '.s'
const owner = { authUserId: uid, orbisIdentityId: id, sessionId: sid, capabilities: ['orbis-admin:production:customers.read'] }
function fixture(values: unknown[]) {
 const fetchImpl = vi.fn()
 for (const value of values) fetchImpl.mockResolvedValueOnce(value instanceof Response ? value : Response.json(value))
 const options = { enabled: true, origin, publicKey: 'public', serviceKey: 'private', fetchImpl }
 return { service: createCustomerService(options), options, fetchImpl }
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
it('reports availability for configured and missing credentials without requests', () => {
 expect(fixture([]).service.available()).toBe(true)
 expect(createCustomerService({}).available()).toBe(false)
})
it('uses the platform fetch implementation for authentication and logout', async () => {
 const f = fixture([{ id: uid }, new Response(null, { status: 204 })]); vi.stubGlobal('fetch', f.fetchImpl)
 const service = createCustomerService({ enabled: true, origin, publicKey: 'public', serviceKey: 'private' })
 await expect(service.logout(token)).resolves.toEqual({ signedOut: true })
 expect(f.fetchImpl).toHaveBeenCalledTimes(2)
})
it('passes verified owner and both cursor states to the directory RPC', async () => {
 const f = fixture([[], []])
 await expect(f.service.directory(owner, null)).resolves.toEqual({ rows: [], nextCursor: null })
 await f.service.directory(owner, id)
 expect(JSON.parse(f.fetchImpl.mock.calls[1][1].body)).toEqual({ p_auth_user_id: uid, p_session_id: sid, p_after: id })
})
it('rejects every control character and incomplete provider profiles', () => {
 for (const address of ['abc\u0001', 'abc\u007f']) expect(() => profileInput({ address })).toThrow()
 expect(() => profileResult({ name: 'Name', address: undefined, alternatePhone: null, dateOfBirth: null, gender: null })).toThrow()
})
it('rejects overlong directory contact values and accepts null contacts', () => {
 const row = { ...binding, name: 'Name', email: null, phone: null }
 expect(directoryResult([row]).rows[0]).toEqual(row)
 for (const change of [{ name: 'x'.repeat(121) }, { email: 'x'.repeat(255) }, { phone: 'x'.repeat(41) }, { email: 3 }, { phone: 3 }]) expect(() => directoryResult([{ ...row, ...change }])).toThrow()
})
it('covers provider contact fallback without substituting invalid metadata', async () => {
 const f = fixture([{ id: uid, email: 3, phone: 4 }, binding])
 await expect(f.service.current(token)).resolves.toMatchObject({ customer: binding })
 expect(JSON.parse(f.fetchImpl.mock.calls[1][1].body).p_name).toBe('Orbis customer')
})
it.each([500, 403])('maps recovery provider HTTP %i safely', async status => {
 const f = fixture([new Response('private', { status })])
 await expect(createCustomerRecovery(f.options).verify({ tokenHash: 'a'.repeat(64) })).rejects.toMatchObject({ status: status >= 500 ? 503 : 401, code: 'CUSTOMER_RECOVERY_FAILED' })
})
it('handles empty successful recovery responses and oversized or malformed JSON', async () => {
 for (const body of ['', 'x'.repeat(65537), 'broken']) {
  const f = fixture([new Response(body)])
  const recovery = createCustomerRecovery(f.options)
  if (!body) await expect(recovery.recover({ email: 'a@b.co', redirectTo: 'https://khata.example/' }, ['https://khata.example'])).resolves.toEqual({ accepted: true })
  else await expect(recovery.verify({ tokenHash: 'a'.repeat(64) })).rejects.toThrow()
 }
})
it.each([null, false, [], { refresh_token: 3 }, { refresh_token: '' }, { refresh_token: 'x'.repeat(8193) }])('rejects an invalid verified recovery session', async value => {
 await expect(createCustomerRecovery(fixture([value]).options).verify({ tokenHash: 'a'.repeat(64) })).rejects.toMatchObject({ code: 'CUSTOMER_SESSION_UNAVAILABLE' })
})
it.each([{ email: 3, redirectTo: 'https://khata.example/' }, { email: 'x'.repeat(255), redirectTo: 'https://khata.example/' }, { email: 'bad', redirectTo: 'https://khata.example/' }, { email: 'a@b.co', redirectTo: 3 }])('rejects malformed recovery contacts before network access', async input => {
 const f = fixture([])
 await expect(createCustomerRecovery(f.options).recover(input, ['https://khata.example'])).rejects.toThrow()
 expect(f.fetchImpl).not.toHaveBeenCalled()
})
it('denies password-only URL credentials and uses platform fetch for recovery', async () => {
 const f = fixture([new Response(null, { status: 204 })]); vi.stubGlobal('fetch', f.fetchImpl)
 const options = { enabled: true, origin, publicKey: 'public', serviceKey: 'private' }
 await expect(createCustomerRecovery(options).recover({ email: 'a@b.co', redirectTo: 'https://:p@khata.example/' }, ['https://khata.example'])).rejects.toThrow()
 await expect(createCustomerRecovery(options).recover({ email: 'a@b.co', redirectTo: 'https://khata.example/' }, ['https://khata.example'])).resolves.toEqual({ accepted: true })
})
