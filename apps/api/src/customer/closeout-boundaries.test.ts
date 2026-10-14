import { describe, expect, it } from 'vitest'
import { CustomerError } from './error.js'
import { directoryCursor, directoryResult, requireCustomerDirectory } from './directory.js'
import { profileInput, profileResult } from './profile.js'

const id = '11111111-1111-7111-8111-111111111111'
const row = { orbisIdentityId: id, displayId: 'ORB-U-23456789', name: 'Test', email: null, phone: null }
const good = { name: 'Test', address: null, alternatePhone: null, dateOfBirth: null, gender: null }
const owner = { authUserId: id, orbisIdentityId: id, sessionId: id, capabilities: ['orbis-admin:production:customers.read'] }
function denied(fn: () => unknown, code: string) {
  try { fn(); throw new Error('Expected denial') }
  catch (error) {
    expect(error).toBeInstanceOf(CustomerError)
    expect((error as CustomerError).code).toBe(code)
  }
}

describe('central account closeout — previously uncovered boundary cases', () => {
  it('validates directory cursor and capability before access', () => {
    expect(directoryCursor(undefined)).toBeNull()
    expect(directoryCursor(id)).toBe(id)
    for (const invalid of [null, 1, {}, 'not-a-uuid', '11111111-1111-4111-8111-111111111111'])
      denied(() => directoryCursor(invalid), 'CUSTOMER_DIRECTORY_INPUT_INVALID')
    expect(() => requireCustomerDirectory(owner)).not.toThrow()
    denied(() => requireCustomerDirectory({ ...owner, capabilities: [] }), 'CUSTOMER_DIRECTORY_DENIED')
  })

  it('rejects every invalid directory row shape and supports the page boundary', () => {
    expect(directoryResult([])).toEqual({ rows: [], nextCursor: null })
    expect(directoryResult([row]).rows).toEqual([row])
    expect(directoryResult(Array.from({ length: 51 }, () => row)).nextCursor).toBe(id)
    for (const invalid of [null, {}, [null], [[]], Array.from({ length: 52 }, () => row),
      [{ ...row, orbisIdentityId: 'wrong' }], [{ ...row, displayId: 'wrong' }],
      [{ ...row, name: '' }], [{ ...row, name: 'x'.repeat(121) }],
      [{ ...row, email: 1 }], [{ ...row, email: 'x'.repeat(255) }],
      [{ ...row, phone: 1 }], [{ ...row, phone: 'x'.repeat(41) }]])
      denied(() => directoryResult(invalid), 'CUSTOMER_DIRECTORY_UNAVAILABLE')
  })

  it('rejects invalid profile outputs without exposing backend response contents', () => {
    expect(profileResult(good)).toEqual(good)
    for (const value of [null, [], {}, { ...good, extra: 1 }, { ...good, name: null },
      { ...good, address: 5 }, { ...good, gender: 'invalid' },
      { ...good, dateOfBirth: '2025-02-30' }])
      denied(() => profileResult(value), 'CUSTOMER_PROFILE_UNAVAILABLE')
  })

  it('handles optional address, date and gender normalization safely', () => {
    expect(profileInput({ address: '  ' })).toEqual({ address: null })
    expect(profileInput({ address: null })).toEqual({ address: null })
    expect(profileInput({ name: ' Test ' })).toEqual({ name: 'Test' })
    expect(profileInput({ dateOfBirth: '' })).toEqual({ dateOfBirth: null })
    expect(profileInput({ gender: null })).toEqual({ gender: null })
    denied(() => profileInput({ address: '\u0000' }), 'CUSTOMER_PROFILE_INVALID')
    denied(() => profileInput({ name: '  ' }), 'CUSTOMER_PROFILE_INVALID')
    denied(() => profileInput({ dateOfBirth: '1899-12-31' }), 'CUSTOMER_PROFILE_INVALID')
    denied(() => profileInput({ dateOfBirth: '2999-01-01' }), 'CUSTOMER_PROFILE_INVALID')
  })
})
