import Fastify from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerMayaControls } from './maya-controls.js'
import { OwnerAccessError } from '../security/owner.js'
import { createMayaControl } from '../security/maya-control.js'

afterEach(() => vi.unstubAllEnvs())
const owner = { authUserId: 'owner', orbisIdentityId: 'identity', capabilities: [
  'orbis-maya:development:development.deploy', 'orbis-maya:development:audit.read'] }
const fixture = () => {
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } })
  const verify = vi.fn().mockResolvedValue(owner)
  const audit = { claim: vi.fn().mockResolvedValue(true), finish: vi.fn().mockResolvedValue(undefined), read: vi.fn().mockResolvedValue([]) }
  const deploy = vi.fn().mockResolvedValue('dep-one')
  registerMayaControls(app, verify, createMayaControl({ audit, deploy, switches: () => Array(4).fill('enabled') }))
  return { app, verify, deploy }
}
describe('versioned Admin security boundary', () => {
  it('verifies owner on session, preparation, execution and audit separately', async () => {
    const f = fixture()
    try {
      const session = await f.app.inject({ url: '/api/v1/admin/session', headers: { authorization: 'Bearer test' } })
      expect(session.json()).toEqual({ orbisIdentityId: 'identity', capabilities: owner.capabilities })
      expect(session.headers['cache-control']).toBe('no-store')
      const prepared = await f.app.inject({ method: 'POST', url: '/api/v1/projects/orbis-maya/deploy/prepare', payload: { revision: 'a'.repeat(40) } })
      const executed = await f.app.inject({ method: 'POST', url: '/api/v1/projects/orbis-maya/deploy/execute', payload: { confirmation: prepared.json().confirmation } })
      expect(executed.statusCode).toBe(200)
      expect((await f.app.inject('/api/v1/projects/orbis-maya/audit')).json()).toEqual([])
      expect(f.verify).toHaveBeenCalledTimes(4)
      expect(f.verify.mock.calls[0][0]).toBe('Bearer test')
    } finally { await f.app.close() }
  })
  it.each([401, 403, 503])('preserves safe access status %s', async (status) => {
    const f = fixture(); f.verify.mockRejectedValue(new OwnerAccessError(status, 'SAFE_CODE'))
    try {
      const response = await f.app.inject('/api/v1/admin/session')
      expect(response.statusCode).toBe(status)
      expect(response.json()).toEqual({ error: 'SAFE_CODE' })
    } finally { await f.app.close() }
  })
  it('does not expose raw provider/database errors', async () => {
    const f = fixture(); f.verify.mockRejectedValue(new Error('secret value'))
    try {
      const response = await f.app.inject('/api/v1/admin/session')
      expect(response.statusCode).toBe(503)
      expect(response.body).not.toContain('secret value')
    } finally { await f.app.close() }
  })
  it.each([{ revision: 'main' }, { revision: 'a'.repeat(40), project: 'orbis-admin' }, {}])('rejects unknown scope or malformed input %j', async (payload) => {
    const f = fixture()
    try {
      const response = await f.app.inject({ method: 'POST', url: '/api/v1/projects/orbis-maya/deploy/prepare', payload })
      expect(response.statusCode).toBe(400)
      expect(response.json()).toEqual({ error: 'INVALID_CONTROL_INPUT' })
      expect(f.deploy).not.toHaveBeenCalled()
    } finally { await f.app.close() }
  })
  it.each(['[]', '{}', 'bad', '[null]', '[{}]', '[{"authUserId":"bad"}]',
    '[{"authUserId":"bad","orbisIdentityId":"bad","capabilities":3}]',
    '[{"authUserId":"bad","orbisIdentityId":"bad","capabilities":[3]}]',
    '[{"authUserId":"bad","orbisIdentityId":"bad","capabilities":[]}]'])('default configuration fails closed: %s', async (bindings) => {
    vi.stubEnv('ORBIS_ADMIN_OWNER_BINDINGS', bindings)
    const app = Fastify(); registerMayaControls(app)
    try { expect((await app.inject('/api/v1/admin/session')).statusCode).toBe(503) } finally { await app.close() }
  })
  it('reads all default write switches and refuses disabled deployment', async () => {
    for (const key of ['ORBIS_ADMIN_WRITES', 'ORBIS_ADMIN_DEPLOY_WRITES', 'ORBIS_ADMIN_RENDER_WRITES', 'ORBIS_ADMIN_MAYA_WRITES']) vi.stubEnv(key, undefined)
    const app = Fastify()
    registerMayaControls(app, vi.fn().mockResolvedValue(owner))
    try {
      const response = await app.inject({ method: 'POST', url: '/api/v1/projects/orbis-maya/deploy/prepare', payload: { revision: 'a'.repeat(40) } })
      expect(response.statusCode).toBe(503)
      expect(response.json()).toEqual({ error: 'ADMIN_WRITES_DISABLED' })
    } finally { await app.close() }
  })
  it('exposes only public login configuration and no owner bindings', async () => {
    vi.stubEnv('ORBIS_ADMIN_SUPABASE_URL', 'https://aqcwhqdzniruvoqwfsij.supabase.co')
    vi.stubEnv('ORBIS_ADMIN_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_public')
    const f = fixture()
    try {
      const response = await f.app.inject('/api/v1/admin/auth-config')
      expect(response.json()).toEqual({ origin: 'https://aqcwhqdzniruvoqwfsij.supabase.co', publishableKey: 'sb_publishable_public' })
      expect(f.verify).not.toHaveBeenCalled()
    } finally { await f.app.close() }
  })
})
