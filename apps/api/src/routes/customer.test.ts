import Fastify from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerCustomerRoutes } from './customer'
import { CustomerError } from '../customer/service'

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })
function fixture() {
  const app = Fastify()
  const service = { directory: vi.fn().mockResolvedValue({ rows: [], nextCursor: null }), profile: vi.fn().mockResolvedValue({ version: 'orbis.customer.profile.v1' }), available: vi.fn().mockReturnValue(true), product: vi.fn().mockResolvedValue({ version: 'orbis.customer.product.v1' }), authenticate: vi.fn().mockResolvedValue({ version: 'orbis.customer.v1' }), refresh: vi.fn().mockResolvedValue({ version: 'orbis.customer.v1' }), current: vi.fn().mockResolvedValue({ version: 'orbis.customer.v1' }), logout: vi.fn().mockResolvedValue({ signedOut: true }) }
  registerCustomerRoutes(app, service, ['https://maya.example', 'https://khata.example'])
  return { app, service }
}
describe('central customer routes', () => {
  it('routes signup, login, refresh, current session and logout to one customer boundary', async () => {
    const { app, service } = fixture()
    expect((await app.inject({ url: '/api/v1/customer/config' })).json()).toEqual({ available: true })
    for (const name of ['signup', 'login', 'refresh']) {
      const response = await app.inject({ method: 'POST', url: '/api/v1/customer/' + name, payload: { identifier: 'phone' } })
      expect(response.statusCode).toBe(200);expect(response.headers['cache-control']).toBe('no-store')
    }
    expect(service.authenticate).toHaveBeenCalledWith({ identifier: 'phone' }, true)
    expect(service.authenticate).toHaveBeenCalledWith({ identifier: 'phone' }, false)
    expect((await app.inject({ url: '/api/v1/customer/session', headers: { authorization: 'Bearer access' } })).statusCode).toBe(200)
    expect((await app.inject({ method: 'POST', url: '/api/v1/customer/logout', headers: { authorization: 'Bearer access' } })).statusCode).toBe(200)
    expect((await app.inject({ url: '/api/v1/customer/session/products/orbis-foundation/production', headers: { authorization: 'Bearer access' } })).statusCode).toBe(200)
    expect((await app.inject({ url: '/api/v1/customer/profile', headers: { authorization: 'Bearer access' } })).statusCode).toBe(200)
    expect((await app.inject({ method: 'POST', url: '/api/v1/customer/profile', headers: { authorization: 'Bearer access' }, payload: { name: 'Name' } })).statusCode).toBe(200)
    expect(service.profile).toHaveBeenCalledWith('access', { name: 'Name' })
    expect(service.product).toHaveBeenCalledWith('access', 'orbis-foundation', 'production')
    expect(service.current).toHaveBeenCalledWith('access');expect(service.logout).toHaveBeenCalledWith('access')
    await app.close()
  })
  it('allows only configured browser origins and supports preflight without cookies', async () => {
    const { app, service } = fixture()
    const allowed = await app.inject({ method: 'OPTIONS', url: '/api/v1/customer/login', headers: { origin: 'https://maya.example' } })
    expect(allowed.statusCode).toBe(204);expect(allowed.headers['access-control-allow-origin']).toBe('https://maya.example')
    expect(allowed.headers['access-control-allow-credentials']).toBeUndefined()
    expect((await app.inject({ url: '/api/v1/customer/session', headers: { origin: 'https://evil.example', authorization: 'Bearer x' } })).statusCode).toBe(403)
    expect(service.current).not.toHaveBeenCalled();await app.close()
  })
  it.each([undefined, 'Basic secret'])('requires a bearer token for current account', async authorization => {
    const { app, service } = fixture()
    const headers = authorization ? { authorization } : {}
    const response = await app.inject({ url: '/api/v1/customer/session', headers })
    expect(response.statusCode).toBe(401);expect(service.current).not.toHaveBeenCalled();await app.close()
  })
  it('returns bounded public errors without credentials or provider details', async () => {
    const { app, service } = fixture()
    service.current.mockRejectedValueOnce(new CustomerError(401, 'CUSTOMER_AUTH_FAILED')).mockRejectedValueOnce(new Error('secret password'))
    const first = await app.inject({ url: '/api/v1/customer/session', headers: { authorization: 'Bearer x' } })
    expect(first.statusCode).toBe(401)
    const second = await app.inject({ url: '/api/v1/customer/session', headers: { authorization: 'Bearer x' } })
    expect(second.statusCode).toBe(503);expect(second.body).not.toContain('secret');await app.close()
  })
  it('limits repeated requests and expires old windows', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });vi.setSystemTime(0)
    const { app } = fixture()
    for (let i = 0; i < 30; i++) expect((await app.inject({ method: 'POST', url: '/api/v1/customer/login', payload: {} })).statusCode).toBe(200)
    expect((await app.inject({ method: 'POST', url: '/api/v1/customer/login', payload: {} })).statusCode).toBe(429)
    vi.setSystemTime(60000)
    expect((await app.inject({ method: 'POST', url: '/api/v1/customer/login', payload: {} })).statusCode).toBe(200);await app.close()
  })
  it('is disabled by default and does not depend on Google owner login', async () => {
    vi.stubEnv('ORBIS_CUSTOMER_AUTH', '')
    const app = Fastify();registerCustomerRoutes(app)
    expect((await app.inject({ method: 'POST', url: '/api/v1/customer/login', payload: {} })).json()).toEqual({ error: 'CUSTOMER_AUTH_NOT_CONFIGURED' })
    await app.close()
  })
})
