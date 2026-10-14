import { describe, expect, it } from 'vitest'
import { customerInput, passwordCredentials } from './input'

describe('shared customer account input', () => {
  it('accepts name and phone signup and preserves the password exactly', () => {
    const input = customerInput({ name: ' অজয় ', identifier: '98765 43210', password: ' spaced password ' }, true)!
    expect(input).toEqual({ name: 'অজয়', identifier: '98765 43210', password: ' spaced password ' })
    expect(passwordCredentials(input)).toEqual({ phone: '+919876543210', password: ' spaced password ' })
  })
  it('supports international phone and case-insensitive email login', () => {
    expect(passwordCredentials({ identifier: '+1 (333) 444-5555', password: 'p' })).toEqual({ phone: '+13334445555', password: 'p' })
    expect(passwordCredentials({ identifier: 'Person@Example.COM', password: 'p' })).toEqual({ email: 'person@example.com', password: 'p' })
    expect(customerInput({ identifier: ' a@b.co ', password: 'p' }, false)).toEqual({ identifier: 'a@b.co', password: 'p' })
  })
  it.each([null, false, [], 1, {}, { identifier: 1, password: 'p' }, { identifier: 'a@b.co', password: 1 },
    { identifier: 'x'.repeat(255), password: 'p' }, { identifier: 'a@b.co', password: 'p'.repeat(257) },
    { identifier: 'a@b.co', password: '' }, { identifier: ' ', password: 'p' },
    { identifier: 'a@b.co', password: 'p', role: 'owner' }, { identifier: 'a@b.co', password: 'p', name: 'x' },
  ])('rejects invalid login inputs and authority injection', value => expect(customerInput(value, false)).toBeNull())
  it.each([{ name: '', identifier: 'a@b.co', password: 'password' },
    { name: ' ', identifier: 'a@b.co', password: 'password' },
    { name: 1, identifier: 'a@b.co', password: 'password' },
    { name: 'x'.repeat(121), identifier: 'a@b.co', password: 'password' },
    { name: 'x', identifier: 'a@b.co', password: 'short' },
  ])('rejects invalid signup', value => expect(customerInput(value, true)).toBeNull())
  it.each(['123', 'test', '1234567890', '+0123456789', '+1234567890123456', 'a@@b.co'])('rejects malformed contact identifiers', identifier => {
    expect(passwordCredentials({ identifier, password: 'p' })).toBeNull()
  })
})
