import { afterEach, expect, it, vi } from 'vitest'
import { createCustomerRecovery } from './recovery'
import { createCustomerService } from './service'
import { profileInput, profileResult } from './profile'
const origin = 'https://aqcwhqdzniruvoqwfsij.supabase.co'
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('rejects malformed redirect URLs, search fragments and passwords before requesting recovery', async () => {
  const fetchImpl = vi.fn(), recovery = createCustomerRecovery({ enabled: true, origin, publicKey: 'public', serviceKey: 'private', fetchImpl })
  for (const redirectTo of ['broken', 'http://khata.example/', 'https://user@khata.example/', 'https://khata.example/path', 'https://khata.example/?x=1', 'https://khata.example/#x', 'https://unapproved.example/']) await expect(recovery.recover({ email: 'a@b.co', redirectTo }, ['https://khata.example'])).rejects.toMatchObject({ status: 400 })
  for (const password of [3, 'short', 'x'.repeat(129)]) await expect(recovery.password('token', { password })).rejects.toMatchObject({ status: 400 })
  expect(fetchImpl).not.toHaveBeenCalled()
})
it('maps recovery rate limits and default service configuration to explicit unavailable errors', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 429 }))
  await expect(createCustomerRecovery({ enabled: true, origin, publicKey: 'public', serviceKey: 'private', fetchImpl }).verify({ tokenHash: 'a'.repeat(64) })).rejects.toMatchObject({ status: 429 })
  for (const options of [{}, { enabled: true }, { enabled: true, origin }, { enabled: true, origin, publicKey: 'public' }]) await expect(createCustomerRecovery(options).verify({ tokenHash: 'a'.repeat(64) })).rejects.toMatchObject({ code: 'CUSTOMER_AUTH_NOT_CONFIGURED' })
})
it('rejects incomplete profile shapes, embedded control characters and invalid remote names', () => {
  const profile = { name: 'Name', address: null, alternatePhone: null, dateOfBirth: null, gender: null }
  for (const body of [{ ...profile, name: undefined }, { ...profile, gender: undefined }, { ...profile, name: 3 }, { ...profile, name: '' }]) expect(() => profileResult(body)).toThrow()
  for (const name of ['Name\u0001', 'Name\u007f']) expect(() => profileInput({ name })).toThrow()
})
it('does not authenticate or expose directories without the authoritative service configuration', async () => {
  const service = createCustomerService({})
  await expect(service.authenticate({ identifier: 'a@b.co', password: 'password' }, false)).rejects.toMatchObject({ code: 'CUSTOMER_AUTH_NOT_CONFIGURED' })
  await expect(service.refresh({ refreshToken: 'refresh' })).rejects.toMatchObject({ code: 'CUSTOMER_AUTH_NOT_CONFIGURED' })
})

it('normalizes a blank optional address without adding profile fields', () => {
  expect(profileInput({ address: '   ' })).toEqual({ address: null })
})
