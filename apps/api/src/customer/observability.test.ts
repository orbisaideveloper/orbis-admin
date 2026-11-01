import { describe, expect, it, vi } from 'vitest'
import { createCustomerObservability, observationFilter } from './observability'
import { observationFixture } from '../../../../packages/contracts/src/customer-observability.fixture'
const origin = 'https://aqcwhqdzniruvoqwfsij.supabase.co'
const owner = { authUserId: 'id', orbisIdentityId: 'identity', sessionId: 'session', capabilities: [] }
const filter = { after: null, project: null, customer: null }
describe('Admin observation adapter', () => {
  it('validates scope and pagination without accepting injected controls', () => {
    expect(observationFilter({})).toEqual(filter)
    const id=observationFixture.customers[0].authUserId
    expect(observationFilter({ after:id,customer:id,project:'orbis-khata' })).toEqual({ after:id,customer:id,project:'orbis-khata' })
    for(const q of [{role:'owner'},{after:'bad'},{customer:3},{project:3},{project:'https://evil'}]) expect(()=>observationFilter(q)).toThrow('OBSERVABILITY_INPUT_INVALID')
  })
  it('fails closed on configuration, upstream failure, large or invalid payload', async () => {
    for(const config of [{},{enabled:true,origin:'https://wrong',serviceKey:'x'},{enabled:true,origin}]) await expect(createCustomerObservability(config)(owner,filter)).rejects.toThrow('OBSERVABILITY_NOT_CONFIGURED')
    const fetchImpl=vi.fn().mockResolvedValueOnce(new Response('',{status:403})).mockResolvedValueOnce(new Response('x'.repeat(262145))).mockResolvedValueOnce(new Response('{}'))
    const read=createCustomerObservability({enabled:true,origin,serviceKey:'server',fetchImpl})
    await expect(read(owner,filter)).rejects.toThrow('OBSERVABILITY_UNAVAILABLE')
    await expect(read(owner,filter)).rejects.toThrow('OBSERVABILITY_UNAVAILABLE')
    await expect(read(owner,filter)).rejects.toThrow('INVALID_OBSERVABILITY')
  })
  it('requests a bounded, server-only RPC and strips unwanted fields', async () => {
    const fetchImpl=vi.fn().mockImplementation(async()=>new Response(JSON.stringify(observationFixture)))
    expect(await createCustomerObservability({enabled:true,origin,serviceKey:'server',fetchImpl})(owner,filter)).toEqual(observationFixture)
    vi.stubGlobal('fetch',fetchImpl)
    expect(await createCustomerObservability({enabled:true,origin,serviceKey:'server'})(owner,filter)).toEqual(observationFixture)
    vi.unstubAllGlobals()
    expect(fetchImpl.mock.calls[0][0]).toBe(origin+'/rest/v1/rpc/orbis_admin_customer_observability')
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({p_auth_user_id:'id',p_session_id:'session',p_after:null,p_project:null,p_customer:null})
  })
})
