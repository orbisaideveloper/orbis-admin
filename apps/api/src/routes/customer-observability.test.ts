import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { registerCustomerObservability } from './customer-observability'
import { OwnerAccessError } from '../security/owner'
import { CustomerError } from '../customer/error'
import { observationFixture } from '../../../../packages/contracts/src/customer-observability.fixture'
describe('protected observation endpoint', () => {
  it('requires owner permission on every read and rejects arbitrary filters', async () => {
    const app=Fastify(),owner={authUserId:'id',orbisIdentityId:'identity',capabilities:['orbis-admin:production:customers.read']}
    const verify=vi.fn().mockResolvedValue(owner),read=vi.fn().mockResolvedValue(observationFixture)
    registerCustomerObservability(app,verify,read)
    const response=await app.inject('/api/v1/admin/customer-observability?project=orbis-khata')
    expect(response.statusCode).toBe(200);expect(response.headers['cache-control']).toBe('no-store')
    expect(read).toHaveBeenCalledWith(owner,{after:null,customer:null,project:'orbis-khata'})
    expect((await app.inject('/api/v1/admin/customer-observability?secret=true')).statusCode).toBe(400)
    verify.mockResolvedValueOnce({...owner,capabilities:[]})
    expect((await app.inject('/api/v1/admin/customer-observability')).statusCode).toBe(403)
    verify.mockRejectedValueOnce(new OwnerAccessError(401,'OWNER_LOGIN_REQUIRED'))
    expect((await app.inject('/api/v1/admin/customer-observability')).statusCode).toBe(401)
    read.mockRejectedValueOnce(new CustomerError(503,'OBSERVABILITY_UNAVAILABLE'))
    expect((await app.inject('/api/v1/admin/customer-observability')).statusCode).toBe(503)
    read.mockRejectedValueOnce(new Error('server-secret'))
    expect((await app.inject('/api/v1/admin/customer-observability')).body).not.toContain('server-secret')
    await app.close()
  })
})
