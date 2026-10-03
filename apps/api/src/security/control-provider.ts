import type { MayaAuditStore } from './maya-control.js'

type ProviderOptions = {
  supabaseOrigin: string
  serviceKey: string
  renderToken: string
  githubToken?: string
  fetchImpl?: typeof fetch
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

export const createControlProviders = (options: ProviderOptions) => {
  const fetchImpl = options.fetchImpl ?? fetch
  const request = async (url: string, init: RequestInit): Promise<unknown> => {
    const response = await fetchImpl(url, {
      ...init, redirect: 'error', signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) throw new Error('Control provider unavailable')
    return response.json()
  }
  const rpc = (name: string, body: unknown) => {
    if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(options.supabaseOrigin) ||
      !options.serviceKey) throw new Error('Audit not configured')
    return request(`${options.supabaseOrigin}/rest/v1/rpc/orbis_admin_${name}`, {
      method: 'POST', headers: {
        apikey: options.serviceKey, authorization: `Bearer ${options.serviceKey}`,
        'content-type': 'application/json',
      }, body: JSON.stringify(body),
    })
  }
  const audit: MayaAuditStore = {
    async claim(action) {
      const result = await rpc('claim_maya_action', {
        p_action_id: action.actionId, p_auth_user_id: action.actor.authUserId,
        p_identity_id: action.actor.orbisIdentityId, p_revision: action.revision,
        p_session_id: action.actor.sessionId,
        p_trace_id: action.traceId,
      })
      if (typeof result !== 'boolean') throw new Error('Invalid audit response')
      return result
    },
    async finish(actionId, outcome, deployId) {
      const result = await rpc('finish_maya_action', {
        p_action_id: actionId, p_outcome: outcome, p_deploy_id: deployId,
      })
      if (result !== true) throw new Error('Invalid audit response')
    },
    async read(owner) {
      const result = await rpc('read_maya_audit', { p_auth_user_id: owner.authUserId,
        p_identity_id: owner.orbisIdentityId })
      if (!Array.isArray(result)) throw new Error('Invalid audit response')
      return result
    },
  }
  return {
    audit,
    async deploy(revision: string): Promise<string> {
      if (!options.renderToken) throw new Error('Render not configured')
      const branch = await request('https://api.github.com/repos/orbisaideveloper/orbis-maya/branches/main', {
        headers: options.githubToken ? { authorization: `Bearer ${options.githubToken}` } : {},
      })
      if (!record(branch) || !record(branch.commit) || branch.commit.sha !== revision) {
        throw new Error('Maya main revision changed')
      }
      const headers = { authorization: `Bearer ${options.renderToken}`,
        'content-type': 'application/json' }
      const serviceUrl = 'https://api.render.com/v1/services/srv-davrsgbncjis73fhhr70'
      const service = await request(serviceUrl, { headers })
      if (!record(service) || service.repo !== 'https://github.com/orbisaideveloper/orbis-maya' ||
        service.branch !== 'main' || service.type !== 'static_site' || service.autoDeploy !== 'no') {
        throw new Error('Render target mismatch')
      }
      const result = await request(`${serviceUrl}/deploys`, {
        method: 'POST', headers, body: JSON.stringify({ commitId: revision, clearCache: 'do_not_clear' }),
      })
      if (!record(result) || typeof result.id !== 'string' || !result.id.startsWith('dep-') ||
        !record(result.commit) || result.commit.id !== revision) {
        throw new Error('Unverified deployment outcome')
      }
      return result.id
    },
  }
}
