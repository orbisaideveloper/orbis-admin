import { CustomerError } from './error.js'
import { passwordCredentials } from './input.js'
export type CustomerProfile = { name: string; address: string | null; alternatePhone: string | null; dateOfBirth: string | null; gender: 'male' | 'female' | 'other' | 'prefer-not-to-say' | null }
export function profileInput(value: unknown): Partial<CustomerProfile> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CustomerError(400, 'CUSTOMER_PROFILE_INVALID')
  const input = value as Record<string, unknown>
  const keys = ['name', 'address', 'alternatePhone', 'dateOfBirth', 'gender']
  if (!Object.keys(input).length || Object.keys(input).some(key => !keys.includes(key))) throw new CustomerError(400, 'CUSTOMER_PROFILE_INVALID')
  const result: Partial<CustomerProfile> = {}
  for (const key of ['name', 'address'] as const) {
    const v = input[key]
    if (v === undefined) continue
    if (key === 'address' && v === null) { result.address = null; continue }
    if (typeof v !== 'string' || v.length > (key === 'name' ? 120 : 1000) || Array.from(v).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) || (key === 'name' && !v.trim())) throw new CustomerError(400, 'CUSTOMER_PROFILE_INVALID')
    if (key === 'name') result.name = v.trim()
    else result.address = v.trim() || null
  }
  if ('alternatePhone' in input) {
    const v = input.alternatePhone
    if (v === null || v === '') result.alternatePhone = null
    else {
      const parsed = typeof v === 'string' && v.length <= 40 ? passwordCredentials({ identifier: v, password: '' }) : null
      if (!parsed || !('phone' in parsed)) throw new CustomerError(400, 'CUSTOMER_PROFILE_INVALID')
      result.alternatePhone = parsed.phone
    }
  }
  if ('dateOfBirth' in input) {
    const v = input.dateOfBirth
    if (v === null || v === '') result.dateOfBirth = null
    else {
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(v)) throw new CustomerError(400, 'CUSTOMER_PROFILE_INVALID')
      const date = new Date(v + 'T00:00:00Z')
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== v || v < '1900-01-01' || v > new Date().toISOString().slice(0,10)) throw new CustomerError(400, 'CUSTOMER_PROFILE_INVALID')
      result.dateOfBirth = v
    }
  }
  if ('gender' in input) {
    const v = input.gender
    if (v !== null && v !== 'male' && v !== 'female' && v !== 'other' && v !== 'prefer-not-to-say') throw new CustomerError(400, 'CUSTOMER_PROFILE_INVALID')
    result.gender = v
  }
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
