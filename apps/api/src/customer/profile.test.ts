import { describe, expect, it } from 'vitest'
import { profileInput, profileResult } from './profile'
describe('central profile validation', () => {
  it('allows incremental optional fields and clearing them', () => {
    expect(profileInput({ name: ' অজয় ', address: ' Kolkata ', alternatePhone: '9876543210', dateOfBirth: '2000-02-29', gender: 'male' })).toEqual({ name: 'অজয়', address: 'Kolkata', alternatePhone: '+919876543210', dateOfBirth: '2000-02-29', gender: 'male' })
    expect(profileInput({ address: null, alternatePhone: '', dateOfBirth: null, gender: null })).toEqual({ address: null, alternatePhone: null, dateOfBirth: null, gender: null })
  })
  it.each([null, [], {}, { name: '' }, { name: 1 }, { name: 'x'.repeat(121) }, { address: 'x'.repeat(1001) }, { address: '\u0000' }, { alternatePhone: 'a@b.co' }, { alternatePhone: 1 }, { dateOfBirth: '2001-02-29' }, { dateOfBirth: '3000-01-01' }, { dateOfBirth: '1899-12-31' }, { dateOfBirth: 'bad' }, { gender: 'owner' }, { password: 'secret' }, { email: 'x@y.co' }, { phone: '9876543210' }, { orbisIdentityId: 'other' }, { roles: ['owner'] }])('rejects invalid fields and authority changes: %j', value => {
    expect(() => profileInput(value)).toThrow('CUSTOMER_PROFILE_INVALID')
  })
  it('requires the complete bounded provider contract', () => {
    const value = { name: 'Name', address: null, alternatePhone: null, dateOfBirth: null, gender: null }
    expect(profileResult(value)).toEqual(value)
    for (const invalid of [null, [], {}, { ...value, password: 'secret' }, { ...value, name: null }]) expect(() => profileResult(invalid)).toThrow('CUSTOMER_PROFILE_UNAVAILABLE')
  })
})
