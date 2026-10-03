import { describe, expect, it, vi } from 'vitest'
import { createOwnerVerifier, requireMayaCapability, requireMayaWrites } from './owner.js'

const binding = { authUserId: '00000000-0000-4000-8000-000000000001',
  orbisIdentityId: '00000000-0000-7000-8000-000000000002',
  capabilities: ['orbis-maya:development:development.deploy', 'orbis-maya:development:audit.read'] }
const options = { origin: 'https://aqcwhqdzniruvoqwfsij.supabase.co', publishableKey: 'public-key', bindings: [binding] }
const sessionId = '00000000-0000-4000-8000-000000000003'
const bearer = `Bearer header.${Buffer.from(JSON.stringify({ session_id: sessionId })).toString('base64url')}.signature`

describe('verified owner boundary', () => {
  it('verifies every request and binds only immutable trusted identifiers', async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => Response.json({ id: binding.authUserId }))
    const verify = createOwnerVerifier({ ...options, fetchImpl })
    expect(await verify(bearer)).toEqual({ ...binding, sessionId })
    await verify(bearer)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ redirect: 'error', headers: { authorization: bearer, apikey: 'public-key' } })
  })
  it.each([
    { origin: 'http://localhost' }, { origin: 'https://attacker.example' },
    { publishableKey: '' }, { bindings: [] },
    { bindings: [{ ...binding, authUserId: 'email@example.com' }] },
    { bindings: [{ ...binding, orbisIdentityId: 'wrong' }] },
    { bindings: [{ ...binding, orbisIdentityId: '00000000-0000-4000-8000-000000000002' }] },
    { bindings: [binding, binding] },
  ])('fails closed on invalid configuration %j', async (patch) => {
    const fetchImpl = vi.fn()
    await expect(createOwnerVerifier({ ...options, ...patch, fetchImpl })(bearer)).rejects.toMatchObject({ status: 503, code: 'OWNER_NOT_CONFIGURED' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it.each([undefined, '', 'Basic abc', 'Bearer x', `Bearer ${'x'.repeat(8193)}`, 'Bearer token secret'])('rejects malformed credentials', async (authorization) => {
    await expect(createOwnerVerifier(options)(authorization)).rejects.toMatchObject({ status: 401 })
  })
  it.each([401, 403, 429, 500])('handles remote status %s without exposing response', async (status) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('secret', { status }))
    await expect(createOwnerVerifier({ ...options, fetchImpl })(bearer)).rejects.toMatchObject({ status: status < 429 ? 401 : 503 })
  })
  it('handles timeout and malformed JSON safely', async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(new Error('sensitive')).mockResolvedValueOnce(new Response('bad'))
    const verify = createOwnerVerifier({ ...options, fetchImpl })
    await expect(verify(bearer)).rejects.toMatchObject({ code: 'OWNER_AUTH_UNAVAILABLE' })
    await expect(verify(bearer)).rejects.toMatchObject({ code: 'OWNER_AUTH_UNAVAILABLE' })
  })
  it.each([null, 'bad', {}, { id: 1 }, { id: 'bad' }])('rejects malformed verified-user payload %j', async (payload) => {
    await expect(createOwnerVerifier({ ...options, fetchImpl: vi.fn().mockResolvedValue(Response.json(payload)) })(bearer)).rejects.toMatchObject({ status: 503 })
  })
  it('does not authorize email or user-editable metadata', async () => {
    const payload = { id: '00000000-0000-4000-8000-000000000009', email: 'owner@example.com', user_metadata: { role: 'owner' }, app_metadata: { role: 'owner' } }
    await expect(createOwnerVerifier({ ...options, fetchImpl: vi.fn().mockResolvedValue(Response.json(payload)) })(bearer)).rejects.toMatchObject({ status: 403 })
  })
  it.each(['malformed', null, {}, { session_id: 4 }, { session_id: 'wrong' }])('requires a verified token session identifier %j', async (claims) => {
    const token = claims === 'malformed' ? bearer.replace(bearer.split('.')[1], 'wrong') :
      `Bearer header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`
    await expect(createOwnerVerifier({ ...options, fetchImpl: vi.fn().mockResolvedValue(Response.json({ id: binding.authUserId })) })(token)).rejects.toMatchObject({ status: 401 })
  })
  it('enforces project, environment and exact capability independently', () => {
    expect(() => requireMayaCapability(binding, 'audit.read', 'orbis-maya', 'development')).not.toThrow()
    for (const [project, environment] of [['orbis-admin', 'development'], ['orbis-maya', 'production'], ['orbis-maya', 'development']]) {
      expect(() => requireMayaCapability({ ...binding, capabilities: [] }, 'development.deploy', project, environment)).toThrow('OWNER_CAPABILITY_DENIED')
    }
  })
  it('requires every explicit emergency enable switch', () => {
    requireMayaWrites(Array(4).fill('enabled'))
    expect(() => requireMayaWrites([])).toThrow('ADMIN_WRITES_DISABLED')
    for (let index = 0; index < 4; index++) {
      const switches = Array<string | undefined>(4).fill('enabled'); switches[index] = undefined
      expect(() => requireMayaWrites(switches)).toThrow('ADMIN_WRITES_DISABLED')
    }
  })
})
