import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { registerCustomerDirectory } from './customer-directory'
import { createCustomerService } from '../customer/service'
import { OwnerAccessError } from '../security/owner'
describe('protected customer directory route', () => {
  it('does not let ordinary customers list customer IDs', async () => {
    const app=Fastify(), verify=vi.fn().mockResolvedValue({ authUserId: 'id', orbisIdentityId: 'id', capabilities: [] }), service=createCustomerService({})
    const directory=vi.spyOn(service,'directory');registerCustomerDirectory(app,verify,service)
    expect((await app.inject('/api/v1/admin/customers')).statusCode).toBe(403)
    expect(directory).not.toHaveBeenCalled();await app.close()
  })
  it('uses owner verification and only a validated cursor', async () => {
    const app=Fastify(), owner={ authUserId: 'id', orbisIdentityId: 'id', sessionId: 'session', capabilities: ['orbis-admin:production:customers.read'] }, verify=vi.fn().mockResolvedValue(owner), service=createCustomerService({})
    const directory=vi.spyOn(service,'directory').mockResolvedValue({ rows: [], nextCursor: null });registerCustomerDirectory(app,verify,service)
    const response=await app.inject('/api/v1/admin/customers')
    expect(response.statusCode).toBe(200);expect(response.headers['cache-control']).toBe('no-store');expect(directory).toHaveBeenCalledWith(owner,null)
    expect((await app.inject('/api/v1/admin/customers?role=owner')).statusCode).toBe(400)
    verify.mockRejectedValueOnce(new OwnerAccessError(401,'OWNER_LOGIN_REQUIRED'))
    expect((await app.inject('/api/v1/admin/customers')).statusCode).toBe(401)
    directory.mockRejectedValueOnce(new Error('secret'))
    expect((await app.inject('/api/v1/admin/customers')).body).not.toContain('secret');await app.close()
  })
})
