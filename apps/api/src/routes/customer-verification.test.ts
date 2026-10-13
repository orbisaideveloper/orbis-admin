import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { registerCustomerVerification } from './customer-verification'
import { CustomerError } from '../customer/service'
const key = 'product-verification-key-at-least-32-characters'
function setup() {
  const app = Fastify(), current = vi.fn().mockResolvedValue({ version: 'orbis.customer.v1' })
  registerCustomerVerification(app, { key, current });return { app, current }
}
describe('service-only central session verification', () => {
  it('requires both the server key and the remotely checked customer token', async () => {
    const { app, current } = setup()
    const response = await app.inject({ url: '/api/v1/service/customer/session', headers: { 'x-orbis-verification-key': key, authorization: 'Bearer central.token' } })
    expect(response.statusCode).toBe(200);expect(response.headers['cache-control']).toBe('no-store')
    expect(current).toHaveBeenCalledWith('central.token');await app.close()
  })
  it.each([{}, { 'x-orbis-verification-key': 'wrong' }, { 'x-orbis-verification-key': key, origin: 'https://khata.example.test' }])('rejects browser/customer requests before verification', async headers => {
    const { app, current } = setup()
    expect((await app.inject({ url: '/api/v1/service/customer/session', headers: { ...headers, authorization: 'Bearer token' } })).statusCode).toBe(403)
    expect(current).not.toHaveBeenCalled();await app.close()
  })
  it('does not accept a service key without a customer token', async () => {
    const { app, current } = setup()
    expect((await app.inject({ url: '/api/v1/service/customer/session', headers: { 'x-orbis-verification-key': key } })).statusCode).toBe(401)
    expect(current).not.toHaveBeenCalled();await app.close()
  })
  it('preserves revoked-session failure and hides unexpected provider details', async () => {
    const { app, current } = setup(), headers = { 'x-orbis-verification-key': key, authorization: 'Bearer token' }
    current.mockRejectedValueOnce(new CustomerError(401, 'CUSTOMER_LOGIN_REQUIRED')).mockRejectedValueOnce(new Error('secret'))
    expect((await app.inject({ url: '/api/v1/service/customer/session', headers })).statusCode).toBe(401)
    const response = await app.inject({ url: '/api/v1/service/customer/session', headers })
    expect(response.statusCode).toBe(503);expect(response.body).not.toContain('secret');await app.close()
  })
})
