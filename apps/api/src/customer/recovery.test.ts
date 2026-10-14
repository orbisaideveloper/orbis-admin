import { describe, expect, it, vi } from 'vitest'
import { createCustomerRecovery } from './recovery'
import Fastify from 'fastify'
import { registerCustomerRoutes } from '../routes/customer'
import { createCustomerService } from './service'

const authority = 'https://aqcwhqdzniruvoqwfsij.supabase.co'
const hash = 'a'.repeat(64)
function setup(values: unknown[] = []) {
  const fetchImpl = vi.fn()
  for (const value of values) fetchImpl.mockResolvedValueOnce(value instanceof Response ? value : Response.json(value))
  const central = { current: vi.fn().mockResolvedValue({ version: 'orbis.customer.v1' }), refresh: vi.fn().mockResolvedValue({ version: 'orbis.customer.v1' }) }
  const options = { enabled: true, origin: authority, publicKey: 'public', serviceKey: 'private', fetchImpl }
  return { recovery: createCustomerRecovery(options, central), central, fetchImpl, options }
}
describe('Admin customer recovery boundary', () => {
  it('sends recovery mail to a strictly allowed product redirect with only the public key', async () => {
    const { recovery, fetchImpl } = setup([{}])
    expect(await recovery.recover({ email: 'A@B.CO', redirectTo: 'https://khata.example/' }, ['https://khata.example'])).toEqual({ accepted: true })
    expect(fetchImpl.mock.calls[0][0]).toBe(authority + '/auth/v1/recover?redirect_to=' + encodeURIComponent('https://khata.example/?orbis_recovery=1'))
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ email: 'a@b.co' })
    expect(fetchImpl.mock.calls[0][1].headers.apikey).toBe('public')
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('private')
  })
  it.each(['https://evil.example/', 'http://khata.example/', 'https://khata.example/path', 'https://khata.example/?next=evil', 'https://u:p@khata.example/', 'bad', 'https://khata.example/#x'])('denies redirect %s before sending email', async redirectTo => {
    const { recovery, fetchImpl } = setup()
    await expect(recovery.recover({ email: 'a@b.co', redirectTo }, ['https://khata.example'])).rejects.toThrow()
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it('verifies only recovery hashes and reuses live central session verification', async () => {
    const { recovery, central, fetchImpl } = setup([{ refresh_token: 'refresh' }])
    expect(await recovery.verify({ tokenHash: hash })).toEqual({ version: 'orbis.customer.v1' })
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ token_hash: hash, type: 'recovery' })
    expect(central.refresh).toHaveBeenCalledWith({ refreshToken: 'refresh' })
  })
  it('checks the live customer before updating the provider password without trimming', async () => {
    const { recovery, central, fetchImpl } = setup([{}])
    expect(await recovery.password('access', { password: ' password ' })).toEqual({ passwordUpdated: true })
    expect(central.current).toHaveBeenCalledWith('access')
    expect(fetchImpl.mock.calls[0][1].method).toBe('PUT')
    expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe('Bearer access')
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ password: ' password ' })
  })
  it('refuses revoked sessions before mutation', async () => {
    const { recovery, central, fetchImpl } = setup()
    central.current.mockRejectedValueOnce(new Error('revoked'))
    await expect(recovery.password('access', { password: 'password' })).rejects.toThrow('revoked')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it.each([null, [], {}, { tokenHash: 'short' }, { tokenHash: hash, type: 'signup' }])('refuses malformed recovery input', async body => {
    const { recovery, fetchImpl } = setup()
    await expect(recovery.verify(body)).rejects.toThrow()
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it.each([null, { password: 'short' }, { password: 'x'.repeat(129) }, { password: 'password', id: 'other' }])('refuses invalid password input', async body => {
    await expect(setup().recovery.password('access', body)).rejects.toThrow()
  })
  it('fails closed on missing config, provider errors and malformed session results', async () => {
    await expect(createCustomerRecovery({}).verify({ tokenHash: hash })).rejects.toMatchObject({ code: 'CUSTOMER_AUTH_NOT_CONFIGURED' })
    await expect(setup([new Response('private', { status: 429 })]).recovery.verify({ tokenHash: hash })).rejects.toMatchObject({ code: 'CUSTOMER_RATE_LIMITED' })
    await expect(setup([new Response('private', { status: 401 })]).recovery.verify({ tokenHash: hash })).rejects.toMatchObject({ code: 'CUSTOMER_RECOVERY_FAILED' })
    await expect(setup([{}]).recovery.verify({ tokenHash: hash })).rejects.toMatchObject({ code: 'CUSTOMER_SESSION_UNAVAILABLE' })
  })
  it('places every new endpoint inside existing CORS, rate and no-store boundaries', async () => {
    const { recovery } = setup([{}, { refresh_token: 'refresh' }, {}])
    const app = Fastify()
    registerCustomerRoutes(app, createCustomerService({}), ['https://khata.example'], recovery)
    const denied = await app.inject({ method: 'POST', url: '/api/v1/customer/recovery', headers: { origin: 'https://evil.example' }, payload: { tokenHash: hash } })
    expect(denied.statusCode).toBe(403)
    const sent = await app.inject({ method: 'POST', url: '/api/v1/customer/recover', headers: { origin: 'https://khata.example' }, payload: { email: 'a@b.co', redirectTo: 'https://khata.example/' } })
    expect(sent.statusCode).toBe(200);expect(sent.headers['cache-control']).toBe('no-store')
    expect((await app.inject({ method: 'POST', url: '/api/v1/customer/recovery', payload: { tokenHash: hash } })).statusCode).toBe(200)
    expect((await app.inject({ method: 'POST', url: '/api/v1/customer/password', payload: { password: 'password' } })).statusCode).toBe(401)
    expect((await app.inject({ method: 'POST', url: '/api/v1/customer/password', headers: { authorization: 'Bearer access' }, payload: { password: 'password' } })).statusCode).toBe(200)
    await app.close()
  })
})
