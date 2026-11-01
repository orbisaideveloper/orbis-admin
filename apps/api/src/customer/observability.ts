import { observationId, parseCustomerObservability } from '@orbis-admin/contracts'
import { CustomerError } from './error.js'
import type { OwnerBinding } from '../security/owner.js'

type Options = { origin?: string; serviceKey?: string; enabled?: boolean; fetchImpl?: typeof fetch }
export type ObservationFilter = { after: string | null; project: string | null; customer: string | null }
export function observationFilter(query: Record<string, unknown>): ObservationFilter {
  if (Object.keys(query).some(key => !['after', 'project', 'customer'].includes(key))) throw new CustomerError(400, 'OBSERVABILITY_INPUT_INVALID')
  const result: ObservationFilter = { after: null, project: null, customer: null }
  for (const key of ['after', 'customer'] as const) {
    if (query[key] !== undefined) {
      if (typeof query[key] !== 'string' || !observationId(query[key])) throw new CustomerError(400, 'OBSERVABILITY_INPUT_INVALID')
      result[key] = query[key]
    }
  }
  if (query.project !== undefined) {
    if (typeof query.project !== 'string' || !/^orbis-[a-z0-9-]{1,60}$/u.test(query.project)) throw new CustomerError(400, 'OBSERVABILITY_INPUT_INVALID')
    result.project = query.project
  }
  return result
}
export function createCustomerObservability(options: Options) {
  return async (owner: OwnerBinding, filter: ObservationFilter) => {
    if (!options.enabled || options.origin !== 'https://aqcwhqdzniruvoqwfsij.supabase.co' || !options.serviceKey) throw new CustomerError(503, 'OBSERVABILITY_NOT_CONFIGURED')
    const response = await (options.fetchImpl ?? fetch)(options.origin + '/rest/v1/rpc/orbis_admin_customer_observability', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8_000),
      headers: { apikey: options.serviceKey, authorization: `Bearer ${options.serviceKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_auth_user_id: owner.authUserId, p_session_id: owner.sessionId, p_after: filter.after, p_project: filter.project, p_customer: filter.customer }),
    })
    if (!response.ok) throw new CustomerError(503, 'OBSERVABILITY_UNAVAILABLE')
    const body = await response.text()
    if (body.length > 262144) throw new CustomerError(503, 'OBSERVABILITY_UNAVAILABLE')
    return parseCustomerObservability(JSON.parse(body))
  }
}
