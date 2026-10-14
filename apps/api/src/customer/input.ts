export type CustomerInput = { identifier: string; password: string; name?: string }
export type PasswordCredentials = { email: string; password: string } | { phone: string; password: string }

export function customerInput(value: unknown, signup: boolean): CustomerInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const body = value as Record<string, unknown>
  const keys = signup ? ['identifier', 'password', 'name'] : ['identifier', 'password']
  if (Object.keys(body).some(key => !keys.includes(key)) ||
      typeof body.identifier !== 'string' || typeof body.password !== 'string' ||
      body.identifier.length > 254 || body.password.length > 256 ||
      body.password.length < (signup ? 8 : 1)) return null
  const identifier = body.identifier.trim()
  if (!identifier) return null
  if (signup && (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 120)) return null
  return { identifier, password: body.password, ...(signup ? { name: (body.name as string).trim() } : {}) }
}

export function passwordCredentials(input: CustomerInput): PasswordCredentials | null {
  if (/^[^\s@]+@[^\s@.]+\.[^\s@]+$/u.test(input.identifier)) {
    return { email: input.identifier.toLowerCase(), password: input.password }
  }
  // Indian national input is accepted; international input requires its country code.
  const compact = input.identifier.replace(/[\s()-]/gu, '')
  const phone = /^[6-9]\d{9}$/u.test(compact) ? '+91' + compact : compact
  if (!/^\+[1-9]\d{7,14}$/u.test(phone)) return null
  return { phone, password: input.password }
}
