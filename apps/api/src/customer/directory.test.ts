import { describe, expect, it } from 'vitest'
import { directoryCursor, directoryResult, requireCustomerDirectory } from './directory'
const id = '11111111-1111-7111-8111-111111111111'
const row = { orbisIdentityId: id, displayId: 'ORB-U-23456789', name: 'Name', email: null, phone: null }
describe('owner customer directory', () => {
  it('requires an explicit customer-read capability', () => {
    expect(() => requireCustomerDirectory({ authUserId: id, orbisIdentityId: id, capabilities: ['orbis-maya:development:audit.read'] })).toThrow('CUSTOMER_DIRECTORY_DENIED')
    expect(() => requireCustomerDirectory({ authUserId: id, orbisIdentityId: id, capabilities: ['orbis-admin:production:customers.read'] })).not.toThrow()
  })
  it('validates cursors and pagination and excludes provider extras', () => {
    expect(directoryCursor(undefined)).toBeNull(); expect(directoryCursor(id)).toBe(id)
    for (const invalid of [null, [], 'bad']) expect(() => directoryCursor(invalid)).toThrow()
    expect(directoryResult([])).toEqual({ rows: [], nextCursor: null })
    expect(directoryResult([{ ...row, password: 'secret' }]).rows).toEqual([row])
    expect(directoryResult(Array.from({ length: 51 }, () => row)).nextCursor).toBe(id)
  })
  it.each([null, {}, Array.from({ length: 52 }, () => row), [null], [{ ...row, name: '' }], [{ ...row, email: 1 }], [{ ...row, phone: 1 }], [{ ...row, orbisIdentityId: 'bad' }]])('rejects malformed provider rows', value => { expect(() => directoryResult(value)).toThrow('CUSTOMER_DIRECTORY_UNAVAILABLE') })
})
