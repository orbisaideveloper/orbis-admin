import { createUuidV7 } from '../identity/identifiers.js'
import { CustomerError } from './error.js'

type Activity = { id: string; action: 'login' | 'signup'; outcome: 'success' | 'failure'; code: string; durationMs: number; origin: string | null; orbisIdentityId: string | null }
type Options = { enabled?: boolean; origin?: string; serviceKey?: string; fetchImpl?: typeof fetch }
/** Bounded, best-effort telemetry. Credentials/body/token/contacts are never collected. */
export function createLoginActivity(options: Options) {
  let pending = 0
  return (event: Activity): void => {
    if (!options.enabled || options.origin !== 'https://aqcwhqdzniruvoqwfsij.supabase.co' || !options.serviceKey || pending >= 32) return
    pending++
    void (async () => {
      try {
        await (options.fetchImpl ?? fetch)(options.origin + '/rest/v1/rpc/orbis_admin_record_login_activity', {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(2_000),
          headers: { apikey: options.serviceKey!, authorization: `Bearer ${options.serviceKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({ p_event: event }),
        })
      } catch { /* Observability failure must never reject or delay authentication. */ }
      finally { pending-- }
    })()
  }
}
export async function observeLogin<T extends { customer: { orbisIdentityId: string } }>(perform: () => Promise<T>, signup: boolean, origin: string | undefined, record: (event: Activity) => void): Promise<T> {
  const start = performance.now()
  let orbisIdentityId: string | null = null
  let code = 'OK', outcome: Activity['outcome'] = 'success'
  try { const result = await perform(); orbisIdentityId = result.customer?.orbisIdentityId ?? null; return result }
  catch (error) {
    outcome = 'failure'; code = error instanceof CustomerError ? error.code : 'CUSTOMER_SERVICE_UNAVAILABLE'
    throw error
  } finally {
    try { record({ id: createUuidV7(), action: signup ? 'signup' : 'login', outcome, code,
      durationMs: Math.round(performance.now() - start), origin: origin ?? null, orbisIdentityId }) } catch { /* Keep login independent of telemetry. */ }
  }
}
