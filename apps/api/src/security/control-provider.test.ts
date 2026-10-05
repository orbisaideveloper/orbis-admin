import { describe, expect, it, vi } from 'vitest'
import { createControlProviders } from './control-provider.js'

const options = { supabaseOrigin: 'https://aqcwhqdzniruvoqwfsij.supabase.co', serviceKey: 'server-only', renderToken: 'render-only' }
const owner = { authUserId: 'owner', orbisIdentityId: 'identity', sessionId: 'session', capabilities: [] }
const action = { actor: owner, actionId: 'action', traceId: 'c'.repeat(32), revision: 'a'.repeat(40), requestedAt: 'now' }
const service = { repo: 'https://github.com/orbisaideveloper/orbis-maya', branch: 'main', type: 'static_site', autoDeploy: 'no' }
describe('bounded server-side control providers', () => {
  it('persists bounded audit fields and verifies RPC results', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json(true)).mockResolvedValueOnce(Response.json(true)).mockResolvedValueOnce(Response.json([]))
    const p = createControlProviders({ ...options, fetchImpl })
    expect(await p.audit.claim(action)).toBe(true)
    await p.audit.finish('action', 'accepted', 'dep-one')
    expect(await p.audit.read(owner)).toEqual([])
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ redirect: 'error', method: 'POST' })
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({ p_auth_user_id: 'owner', p_session_id: 'session' })
  })
  it.each(['origin', 'key'])('fails closed before any RPC with missing %s', async (missing) => {
    const fetchImpl = vi.fn()
    const p = createControlProviders({ ...options, fetchImpl,
      supabaseOrigin: missing === 'origin' ? 'http://attacker' : options.supabaseOrigin,
      serviceKey: missing === 'key' ? '' : options.serviceKey })
    await expect(p.audit.claim(action)).rejects.toThrow('Audit not configured')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it('rejects failed and malformed RPC responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response('secret', { status: 503 }))
      .mockResolvedValueOnce(Response.json({ secret: 'bad' })).mockResolvedValueOnce(Response.json(false)).mockResolvedValueOnce(Response.json({}))
    const p = createControlProviders({ ...options, fetchImpl })
    await expect(p.audit.claim(action)).rejects.toThrow('Control provider unavailable')
    await expect(p.audit.claim(action)).rejects.toThrow('Invalid audit response')
    await expect(p.audit.finish('action', 'unknown', null)).rejects.toThrow('Invalid audit response')
    await expect(p.audit.read(owner)).rejects.toThrow('Invalid audit response')
  })
  it.each([false, true])('pins the revision and fixed service, with GitHub token=%s', async (token) => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json({ commit: { sha: action.revision } }))
      .mockResolvedValueOnce(Response.json(service)).mockResolvedValueOnce(Response.json({ id: 'dep-one', commit: { id: action.revision } }))
    const p = createControlProviders({ ...options, fetchImpl, githubToken: token ? 'github-only' : undefined })
    expect(await p.deploy(action.revision)).toBe('dep-one')
    expect(JSON.parse(fetchImpl.mock.calls[2][1].body)).toEqual({ commitId: action.revision, clearCache: 'do_not_clear' })
    expect(fetchImpl.mock.calls[2][0]).toBe('https://api.render.com/v1/services/srv-davrsgbncjis73fhhr70/deploys')
  })
  it('never calls a provider without the Render credential', async () => {
    const fetchImpl = vi.fn()
    await expect(createControlProviders({ ...options, renderToken: '', fetchImpl }).deploy(action.revision)).rejects.toThrow('Render not configured')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it.each([null, 'bad', [], {}, { commit: null }, { commit: { sha: 'old' } }])('rejects stale or invalid main %j', async (branch) => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json(branch))
    await expect(createControlProviders({ ...options, fetchImpl }).deploy(action.revision)).rejects.toThrow('Maya main revision changed')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
  it.each([null, { ...service, repo: 'wrong' }, { ...service, branch: 'staging' }, { ...service, type: 'web_service' }, { ...service, autoDeploy: 'yes' }])('rejects service mismatch %j', async (target) => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json({ commit: { sha: action.revision } })).mockResolvedValueOnce(Response.json(target))
    await expect(createControlProviders({ ...options, fetchImpl }).deploy(action.revision)).rejects.toThrow('Render target mismatch')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
  it.each([null, {}, { id: 3 }, { id: 'other' }, { id: 'dep-one', commit: null }, { id: 'dep-one', commit: { id: 'wrong' } }])('does not claim success for unverified deploy response %j', async (result) => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json({ commit: { sha: action.revision } })).mockResolvedValueOnce(Response.json(service)).mockResolvedValueOnce(Response.json(result))
    await expect(createControlProviders({ ...options, fetchImpl }).deploy(action.revision)).rejects.toThrow('Unverified deployment outcome')
  })
})
