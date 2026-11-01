import { describe, expect, it } from 'vitest'
import { observationId, parseCustomerObservability } from './customer-observability'
import { id, customer, event, observationFixture } from './customer-observability.fixture'
describe('Admin observation contract', () => {
  it('keeps only explicit read-model fields and accepts nullable identity', () => {
    expect(observationId(id)).toBe(true);expect(observationId('bad')).toBe(false)
    expect(parseCustomerObservability({ ...observationFixture, token: 'secret' })).toEqual(observationFixture)
    expect(parseCustomerObservability({ ...observationFixture, nextCursor: id }).nextCursor).toBe(id)
    const orphan = { ...customer, orbisIdentityId: null, displayId: null, email: null, lastSignInAt: null, phone: '+91' }
    expect(parseCustomerObservability({ ...observationFixture, customers: [orphan], activity: [{ ...event, projectId: 'orbis-khata', orbisIdentityId: id, contactHint: 'masked' }] }).customers).toEqual([orphan])
  })
  it('rejects malformed, oversized, duplicate and inconsistent responses', () => {
    const invalid: unknown[] = [null, [], {}, { ...observationFixture, version: 'other' }, { ...observationFixture, customers: Array(51).fill(customer) }, { ...observationFixture, customers: [customer,customer] }, { ...observationFixture, customers: [], nextCursor: id }, { ...observationFixture, checkedAt: 'no-date' }, { ...observationFixture, total: -1 }, { ...observationFixture, total: '1' }, { ...observationFixture, total: .5 }, { ...observationFixture, activity: null }]
    for (const patch of [{ authUserId: 'bad' }, { name: 3 }, { name: 'a'.repeat(255) }, { products: [null] }, { products: [{ projectId: false }] }]) invalid.push({ ...observationFixture, customers: [{ ...customer, ...patch }] })
    for (const value of invalid) expect(() => parseCustomerObservability(value)).toThrow('INVALID_OBSERVABILITY')
  })
})

it('supports the previous read model during rollout and validates full-window login totals',()=>{
  const legacy={...observationFixture,loginTotals:undefined,activity:[{...event,outcome:'success'},event,{...event,action:'signup'}]}
  expect(parseCustomerObservability(legacy).loginTotals).toEqual({success:1,failure:1})
  expect(parseCustomerObservability({...legacy,activity:[]}).loginTotals).toEqual({success:0,failure:0})
  expect(()=>parseCustomerObservability({...observationFixture,loginTotals:null})).toThrow('INVALID_OBSERVABILITY')
  expect(()=>parseCustomerObservability({...observationFixture,loginTotals:{success:-1,failure:0}})).toThrow('INVALID_OBSERVABILITY')
  expect(()=>parseCustomerObservability({...observationFixture,activity:Array(101).fill(event)})).toThrow('INVALID_OBSERVABILITY')
})
