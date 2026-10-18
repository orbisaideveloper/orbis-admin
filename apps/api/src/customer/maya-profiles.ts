import { CustomerError } from './error.js'
import type { createCustomerService, CustomerServiceOptions } from './service.js'
type ObjectValue = Record<string, unknown>
type BirthLocation = { label: string; latitude: number; longitude: number; timezone: string }
type BirthProfile = { name: string; birthDate: string; birthTime: string; birthPlace: string; birthLocation?: BirthLocation }
type BirthEntry = { slot: 1 | 2 | 3 | 4 | 5; relation: string; profile: BirthProfile }
type Patch = BirthEntry & { expectedRevision: number }
const invalid = (): never => { throw new CustomerError(400, 'MAYA_PROFILE_INVALID') }
function object(value: unknown): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid()
  return value as ObjectValue
}
function text(value: unknown, limit: number): string {
  if (typeof value !== 'string' || value.length > limit || Array.from(value).some(c => c.codePointAt(0)! < 32 || c.codePointAt(0)! === 127)) return invalid()
  return value.trim()
}
function location(value: unknown, place: string): BirthLocation {
  const entry = object(value)
  if (Object.keys(entry).sort((a,b) => a.localeCompare(b)).join(',') !== 'label,latitude,longitude,timezone' || entry.label !== place || !place ||
      typeof entry.latitude !== 'number' || !Number.isFinite(entry.latitude) || Math.abs(entry.latitude) > 90 ||
      typeof entry.longitude !== 'number' || !Number.isFinite(entry.longitude) || Math.abs(entry.longitude) > 180) return invalid()
  const timezone = text(entry.timezone, 100)
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(0) } catch { return invalid() }
  return { label: place, latitude: entry.latitude, longitude: entry.longitude, timezone }
}
function profile(value: unknown): BirthProfile {
  const entry = object(value)
  const keys = Object.keys(entry)
  if (keys.some(key => !['name', 'birthDate', 'birthTime', 'birthPlace', 'birthLocation'].includes(key))) return invalid()
  const name = text(entry.name, 100), birthDate = text(entry.birthDate, 10)
  const birthTime = text(entry.birthTime, 5), birthPlace = text(entry.birthPlace, 200)
  if (!name || (birthTime && !/^([01]\d|2[0-3]):[0-5]\d$/u.test(birthTime))) return invalid()
  if (birthDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(birthDate)) return invalid()
    const date = new Date(birthDate + 'T00:00:00Z')
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== birthDate || date.getTime() > Date.now()) return invalid()
  }
  const result: BirthProfile = { name, birthDate, birthTime, birthPlace }
  if ('birthLocation' in entry) result.birthLocation = location(entry.birthLocation, birthPlace)
  return result
}
function birthEntry(value: unknown): BirthEntry {
  const entry = object(value)
  if (![1,2,3,4,5].includes(Number(entry.slot)) || typeof entry.slot !== 'number') return invalid()
  return { slot: entry.slot as BirthEntry['slot'], relation: text(entry.relation, 100), profile: profile(entry.profile) }
}
export function birthPatch(value: unknown): Patch {
  const entry = object(value)
  if (Object.keys(entry).sort((a,b) => a.localeCompare(b)).join(',') !== 'expectedRevision,profile,relation,slot' ||
      !Number.isSafeInteger(entry.expectedRevision) || Number(entry.expectedRevision) < 0 || Number(entry.expectedRevision) > 1_000_000_000) return invalid()
  return { ...birthEntry(entry), expectedRevision: Number(entry.expectedRevision) }
}
export function birthResult(value: unknown): { revision: number; profiles: BirthEntry[] } {
  try {
    const entry = object(value)
    if (!Number.isSafeInteger(entry.revision) || Number(entry.revision) < 0 || Number(entry.revision) > 1_000_000_001 || !Array.isArray(entry.profiles) || entry.profiles.length > 5) return invalid()
    const profiles = entry.profiles.map(birthEntry)
    if (new Set(profiles.map(p => p.slot)).size !== profiles.length) return invalid()
    return { revision: Number(entry.revision), profiles }
  } catch { throw new CustomerError(503, 'MAYA_PROFILE_UNAVAILABLE') }
}
export function createMayaProfiles(service: Pick<ReturnType<typeof createCustomerService>, 'current'>, options: Pick<CustomerServiceOptions, 'serviceKey' | 'fetchImpl'>) {
  return async (accessToken: string, body?: unknown) => {
    const patch = body === undefined ? null : birthPatch(body)
    if (!options.serviceKey) throw new CustomerError(503, 'MAYA_PROFILE_UNAVAILABLE')
    const current = await service.current(accessToken)
    // current() remotely verified this exact token, issuer, sub and live session.
    const claims = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString()) as { sub: string; session_id: string }
    const response = await (options.fetchImpl ?? fetch)('https://aqcwhqdzniruvoqwfsij.supabase.co/rest/v1/rpc/orbis_maya_birth_profiles', {
      method: 'POST', redirect: 'error', headers: { apikey: options.serviceKey, authorization: `Bearer ${options.serviceKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_auth_user_id: claims.sub, p_session_id: claims.session_id, p_patch: patch }), signal: AbortSignal.timeout(10000),
    })
    const raw = await response.text()
    if (raw.length > 65536) throw new CustomerError(503, 'MAYA_PROFILE_UNAVAILABLE')
    const result: unknown = JSON.parse(raw)
    if (!response.ok) {
      if (result && typeof result === 'object' && 'code' in result && result.code === '40001') throw new CustomerError(409, 'MAYA_PROFILE_CONFLICT')
      throw new CustomerError(503, 'MAYA_PROFILE_UNAVAILABLE')
    }
    return { version: 'orbis.maya.profiles.v1', customer: current.customer, ...birthResult(result) }
  }
}
