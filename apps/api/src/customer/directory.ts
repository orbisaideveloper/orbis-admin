import { CustomerError } from './error.js'
import type { OwnerBinding } from '../security/owner.js'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
export type CustomerDirectoryRow = { orbisIdentityId: string; displayId: string; name: string; email: string | null; phone: string | null }
export function directoryCursor(value: unknown): string | null {
  if (value === undefined) return null
  if (typeof value !== 'string' || !uuid.test(value)) throw new CustomerError(400, 'CUSTOMER_DIRECTORY_INPUT_INVALID')
  return value
}
export function requireCustomerDirectory(owner: OwnerBinding) {
  if (!owner.capabilities.includes('orbis-admin:production:customers.read')) throw new CustomerError(403, 'CUSTOMER_DIRECTORY_DENIED')
}
export function directoryResult(value: unknown): { rows: CustomerDirectoryRow[]; nextCursor: string | null } {
  if (!Array.isArray(value) || value.length > 51) throw new CustomerError(503, 'CUSTOMER_DIRECTORY_UNAVAILABLE')
  const rows = value.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new CustomerError(503, 'CUSTOMER_DIRECTORY_UNAVAILABLE')
    const row = item as Record<string, unknown>
    if (typeof row.orbisIdentityId !== 'string' || !uuid.test(row.orbisIdentityId) || typeof row.displayId !== 'string' || !/^ORB-U-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/u.test(row.displayId) || typeof row.name !== 'string' || row.name.length > 120 || !row.name.trim() || (row.email !== null && (typeof row.email !== 'string' || row.email.length > 254)) || (row.phone !== null && (typeof row.phone !== 'string' || row.phone.length > 40))) throw new CustomerError(503, 'CUSTOMER_DIRECTORY_UNAVAILABLE')
    return { orbisIdentityId: row.orbisIdentityId, displayId: row.displayId, name: row.name, email: row.email, phone: row.phone }
  })
  const page = rows.slice(0,50)
  return { rows: page, nextCursor: rows.length > 50 ? page[49].orbisIdentityId : null }
}
