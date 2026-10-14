import Fastify from 'fastify'
import { afterEach, expect, it, vi } from 'vitest'
import { registerCustomerDirectory } from './customer-directory'
import { registerCustomerVerification } from './customer-verification'
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })
it.each(['{', '{}', '[null]', '[{}]', '[{"authUserId":3}]', '[{"authUserId":"id","orbisIdentityId":3}]', '[{"authUserId":"id","orbisIdentityId":"id","capabilities":3}]', '[{"authUserId":"id","orbisIdentityId":"id","capabilities":[3]}]', '[{"authUserId":"id","orbisIdentityId":"id","capabilities":[]}]'])('fails closed with owner binding configuration %s', async bindings => {
 vi.stubEnv('ORBIS_ADMIN_OWNER_BINDINGS', bindings)
 const app = Fastify()
 try { registerCustomerDirectory(app); const response = await app.inject('/api/v1/admin/customers')
 expect(response.statusCode).toBe(503); expect(response.json()).toEqual({ error: 'OWNER_NOT_CONFIGURED' }) }
 finally { await app.close() }
})
it('uses absent owner configuration and absent verification key safely', async () => {
 vi.stubEnv('ORBIS_ADMIN_OWNER_BINDINGS', undefined); vi.stubEnv('ORBIS_CUSTOMER_VERIFY_KEY', undefined)
 const app = Fastify()
 try { registerCustomerDirectory(app); registerCustomerVerification(app)
 expect((await app.inject('/api/v1/admin/customers')).statusCode).toBe(503)
 expect((await app.inject('/api/v1/service/customer/session')).statusCode).toBe(403)
 } finally { await app.close() }
})
it('uses default central verifier only after a valid server key and rejects unconfigured auth', async () => {
 vi.stubEnv('ORBIS_CUSTOMER_VERIFY_KEY', 'a'.repeat(32)); vi.stubEnv('ORBIS_CUSTOMER_AUTH', undefined)
 const app = Fastify()
 try { registerCustomerVerification(app)
 const response = await app.inject({ url: '/api/v1/service/customer/session', headers: { 'x-orbis-verification-key': 'a'.repeat(32), authorization: 'Bearer token' } })
 expect(response.statusCode).toBe(503); expect(response.json()).toEqual({ error: 'CUSTOMER_AUTH_NOT_CONFIGURED' })
 } finally { await app.close() }
})
