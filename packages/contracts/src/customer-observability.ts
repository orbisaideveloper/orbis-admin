/** Admin-only read model. Product accounting data and credentials never cross it. */
export type CustomerUsage = {
  authUserId: string; orbisIdentityId: string | null; displayId: string | null
  name: string; email: string | null; phone: string | null; status: string
  registeredAt: string; lastSignInAt: string | null
  products: { projectId: string; environment: string }[]
}
export type LoginActivity = {
  id: string; at: string; action: string; outcome: string; code: string
  projectId: string | null; orbisIdentityId: string | null; contactHint: string | null; durationMs: number
}
export type CustomerObservability = {
  version: 'orbis.admin.customers.v1'; checkedAt: string
  total: number; unlinked: number; customers: CustomerUsage[]; nextCursor: string | null
  activity: LoginActivity[]
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
export function observationId(value: string): boolean { return uuid.test(value) }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_OBSERVABILITY')
  return value as Record<string, unknown>
}
function text(value: unknown): string {
  if (typeof value !== 'string' || value.length > 254) throw new Error('INVALID_OBSERVABILITY')
  return value
}
function nullable(value: unknown): string | null { return value === null ? null : text(value) }
function id(value: unknown): string {
  const result = text(value)
  if (!observationId(result)) throw new Error('INVALID_OBSERVABILITY')
  return result
}
function nullableId(value: unknown): string | null { return value === null ? null : id(value) }
function timestamp(value: unknown): string {
  const result = text(value)
  if (!Number.isFinite(Date.parse(result))) throw new Error('INVALID_OBSERVABILITY')
  return result
}
function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('INVALID_OBSERVABILITY')
  return value
}
function list(value: unknown, limit: number): unknown[] {
  if (!Array.isArray(value) || value.length > limit) throw new Error('INVALID_OBSERVABILITY')
  return value
}
function customer(value: unknown): CustomerUsage {
  const row = object(value)
  return {
    authUserId: id(row.authUserId), orbisIdentityId: nullableId(row.orbisIdentityId), displayId: nullable(row.displayId),
    name: text(row.name), email: nullable(row.email), phone: nullable(row.phone), status: text(row.status),
    registeredAt: timestamp(row.registeredAt), lastSignInAt: row.lastSignInAt === null ? null : timestamp(row.lastSignInAt),
    products: list(row.products, 100).map(value => { const product = object(value); return { projectId: text(product.projectId), environment: text(product.environment) } }),
  }
}
function activity(value: unknown): LoginActivity {
  const row = object(value)
  return { id: id(row.id), at: timestamp(row.at), action: text(row.action), outcome: text(row.outcome), code: text(row.code),
    projectId: nullable(row.projectId), orbisIdentityId: nullableId(row.orbisIdentityId), contactHint: nullable(row.contactHint), durationMs: count(row.durationMs) }
}
export function parseCustomerObservability(value: unknown): CustomerObservability {
  const row = object(value)
  if (row.version !== 'orbis.admin.customers.v1') throw new Error('INVALID_OBSERVABILITY')
  const customers = list(row.customers, 50).map(customer)
  const nextCursor = nullableId(row.nextCursor)
  if (new Set(customers.map(row => row.authUserId)).size !== customers.length || (nextCursor !== null && nextCursor !== customers.at(-1)?.authUserId)) throw new Error('INVALID_OBSERVABILITY')
  return { version: row.version, checkedAt: timestamp(row.checkedAt), total: count(row.total), unlinked: count(row.unlinked),
    customers, nextCursor, activity: list(row.activity, 50).map(activity) }
}
