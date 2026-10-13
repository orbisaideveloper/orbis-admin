import { describe, expect, it } from 'vitest'
import { customerProducts, customerEnvironments, productBinding, productScope } from './product'
const identity = '11111111-1111-7111-8111-111111111111'
const local = '22222222-2222-4222-8222-222222222222'
const expected = { projectId: 'orbis-foundation' as const, environment: 'production' as const, orbisIdentityId: identity }
const binding = { ...expected, localAuthUserId: local, localAccountId: local }
describe('central identity and product ownership mapping', () => {
  it('supports every registered product/environment without changing the central identity', () => {
    for (const projectId of customerProducts) for (const environment of customerEnvironments) {
      expect(productScope(projectId, environment)).toEqual({ projectId, environment })
      const scope = { ...expected, projectId, environment }
      expect(productBinding({ ...binding, ...scope }, scope).orbisIdentityId).toBe(identity)
    }
  })
  it('preserves legacy local owner IDs and permits profiles without an account row', () => {
    expect(productBinding(binding, expected)).toMatchObject({ localAuthUserId: local, localAccountId: local })
    expect(productBinding({ ...binding, localAccountId: null }, expected).localAccountId).toBeNull()
  })
  it.each([['orbis-admin', 'production'], ['orbis-foundation', 'unknown']])('does not grant owner access or unknown environment %s/%s', (project, environment) => {
    expect(() => productScope(project, environment)).toThrow('CUSTOMER_PRODUCT_INVALID')
  })
  it('does not silently create a second customer/account when mapping is absent', () => {
    expect(() => productBinding(null, expected)).toThrow('CUSTOMER_PRODUCT_NOT_LINKED')
  })
  it.each([{}, false, [], { ...binding, projectId: 'orbis-khata' }, { ...binding, environment: 'staging' },
    { ...binding, orbisIdentityId: local }, { ...binding, localAuthUserId: 1 }, { ...binding, localAuthUserId: 'bad' },
    { ...binding, localAccountId: 1 }, { ...binding, localAccountId: 'bad' },
  ])('rejects tenant/environment and malformed ID mismatches', value => {
    expect(() => productBinding(value, expected)).toThrow('CUSTOMER_PRODUCT_BINDING_INVALID')
  })
})
