import { CustomerError } from './error.js'
import { passwordCredentials } from './input.js'
export type CustomerProfile = { name: string; address: string | null; alternatePhone: string | null; dateOfBirth: string | null; gender: 'male' | 'female' | 'other' | 'prefer-not-to-say' | null }
function invalidProfile(): never { throw new CustomerError(400, 'CUSTOMER_PROFILE_INVALID') }
function textField(value: unknown, key: 'name' | 'address'): string | null {
  if (key === 'address' && value === null) return null
  if (typeof value !== 'string') return invalidProfile()
  const limit = key === 'name' ? 120 : 1000
  const controls = Array.from(value).some(character => {
    const point = character.codePointAt(0) as number
    return point < 32 || point === 127
  })
  if (value.length > limit || controls) return invalidProfile()
  const trimmed = value.trim()
  if (key === 'name' && !trimmed) return invalidProfile()
  return trimmed || null
}
function phoneField(value: unknown): string | null {
  if (value === null || value === '') return null
  const parsed = typeof value === 'string' && value.length <= 40 ? passwordCredentials({ identifier: value, password: '' }) : null
  if (!parsed || !('phone' in parsed)) return invalidProfile()
  return parsed.phone
}
function birthField(value: unknown): string | null {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return invalidProfile()
  const date = new Date(value + 'T00:00:00Z')
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value || value < '1900-01-01' || value > new Date().toISOString().slice(0,10)) return invalidProfile()
  return value
}
function genderField(value: unknown): CustomerProfile['gender'] {
  if (value !== null && value !== 'male' && value !== 'female' && value !== 'other' && value !== 'prefer-not-to-say') return invalidProfile()
  return value
}
export function profileInput(value: unknown): Partial<CustomerProfile> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalidProfile()
  const input = value as Record<string, unknown>
  const keys = new Set(['name', 'address', 'alternatePhone', 'dateOfBirth', 'gender'])
  if (!Object.keys(input).length || Object.keys(input).some(key => !keys.has(key))) return invalidProfile()
  const result: Partial<CustomerProfile> = {}
  if (input.name !== undefined) result.name = textField(input.name, 'name') as string
  if (input.address !== undefined) result.address = textField(input.address, 'address')
  if ('alternatePhone' in input) result.alternatePhone = phoneField(input.alternatePhone)
  if ('dateOfBirth' in input) result.dateOfBirth = birthField(input.dateOfBirth)
  if ('gender' in input) result.gender = genderField(input.gender)
  return result
}
export function profileResult(value: unknown): CustomerProfile {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 5) throw new Error('shape')
    const profile = profileInput(value)
    if (Object.keys(profile).length !== 5 || typeof profile.name !== 'string') throw new Error('shape')
    return profile as CustomerProfile
  } catch { throw new CustomerError(503, 'CUSTOMER_PROFILE_UNAVAILABLE') }
}
