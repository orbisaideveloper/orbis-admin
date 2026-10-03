import { describe, expect, it, vi } from 'vitest'
import { createMayaControl } from './maya-control.js'

const owner = { authUserId: 'owner', orbisIdentityId: 'identity',
  capabilities: ['orbis-maya:development:development.deploy', 'orbis-maya:development:audit.read'] }
const revision = 'a'.repeat(40)
const fixture = () => {
  let time = 1_000
  const audit = { claim: vi.fn().mockResolvedValue(true), finish: vi.fn().mockResolvedValue(undefined), read: vi.fn().mockResolvedValue([]) }
  const deploy = vi.fn().mockResolvedValue('dep-accepted')
  const switches = vi.fn(() => Array(4).fill('enabled'))
  const control = createMayaControl({ audit, deploy, switches, now: () => time })
  return { control, audit, deploy, switches, advance: () => { time += 90_000 } }
}
describe('audited Maya development executor', () => {
  it('records durable intent before an exact-revision provider call and outcome afterward', async () => {
    const f = fixture(); const action = f.control.prepare(owner, revision)
    expect(action.actionId[14]).toBe('7')
    expect(await f.control.execute(owner, action.confirmation)).toMatchObject({ deployId: 'dep-accepted', state: 'accepted' })
    expect(f.audit.claim.mock.invocationCallOrder[0]).toBeLessThan(f.deploy.mock.invocationCallOrder[0])
    expect(f.deploy.mock.calls[0]).toEqual([revision])
    expect(f.audit.finish).toHaveBeenCalledWith(action.actionId, 'accepted', 'dep-accepted')
    await expect(f.control.execute(owner, action.confirmation)).rejects.toThrow('CONFIRMATION_INVALID')
    expect(f.deploy).toHaveBeenCalledTimes(1)
  })
  it('prevents concurrent confirmation replay before awaiting audit', async () => {
    const f = fixture(); const action = f.control.prepare(owner, revision)
    const first = f.control.execute(owner, action.confirmation)
    await expect(f.control.execute(owner, action.confirmation)).rejects.toThrow('CONFIRMATION_INVALID')
    await first
    expect(f.deploy).toHaveBeenCalledTimes(1)
  })
  it.each(['expired', 'auth', 'identity', 'missing'])('rejects invalid confirmation %s', async (reason) => {
    const f = fixture(); const action = f.control.prepare(owner, revision)
    if (reason === 'expired') f.advance()
    const actor = { ...owner, authUserId: reason === 'auth' ? 'other' : owner.authUserId,
      orbisIdentityId: reason === 'identity' ? 'other' : owner.orbisIdentityId }
    await expect(f.control.execute(actor, reason === 'missing' ? 'wrong' : action.confirmation)).rejects.toThrow('CONFIRMATION_INVALID')
    expect(f.deploy).not.toHaveBeenCalled()
  })
  it('checks revoked permissions and emergency switches again at execution', async () => {
    const f = fixture(); const action = f.control.prepare(owner, revision)
    await expect(f.control.execute({ ...owner, capabilities: [] }, action.confirmation)).rejects.toThrow('OWNER_CAPABILITY_DENIED')
    f.switches.mockReturnValue([])
    await expect(f.control.execute(owner, action.confirmation)).rejects.toThrow('ADMIN_WRITES_DISABLED')
  })
  it.each([false, 'unavailable'])('never calls provider when audit claim fails: %s', async (outcome) => {
    const f = fixture(); const action = f.control.prepare(owner, revision)
    if (outcome === false) f.audit.claim.mockResolvedValue(false)
    else f.audit.claim.mockRejectedValue(new Error('database secret'))
    await expect(f.control.execute(owner, action.confirmation)).rejects.toThrow(outcome === false ? 'ACTION_ALREADY_RECORDED' : 'AUDIT_UNAVAILABLE')
    expect(f.deploy).not.toHaveBeenCalled()
  })
  it('marks ambiguous provider outcomes and does not retry a provider write', async () => {
    const f = fixture(); const action = f.control.prepare(owner, revision)
    f.deploy.mockRejectedValue(new Error('timeout'))
    await expect(f.control.execute(owner, action.confirmation)).rejects.toThrow('DEPLOY_OUTCOME_UNKNOWN')
    expect(f.audit.finish).toHaveBeenCalledWith(action.actionId, 'unknown', null)
  })
  it('does not claim success when durable outcome recording fails', async () => {
    const f = fixture(); const action = f.control.prepare(owner, revision)
    f.audit.finish.mockRejectedValue(new Error('database down'))
    await expect(f.control.execute(owner, action.confirmation)).rejects.toThrow('AUDIT_OUTCOME_PENDING')
  })
  it('bounds and expires confirmations; rejects malformed SHA', () => {
    const f = fixture()
    expect(() => f.control.prepare(owner, 'main')).toThrow('INVALID_REVISION')
    for (let i = 0; i < 100; i++) f.control.prepare(owner, revision)
    expect(() => f.control.prepare(owner, revision)).toThrow('CONFIRMATION_LIMIT')
    f.advance()
    expect(f.control.prepare(owner, revision).revision).toBe(revision)
  })
  it('requires a read capability and allows audit when writes are disabled', async () => {
    const f = fixture(); f.switches.mockReturnValue([])
    expect(await f.control.audit(owner)).toEqual([])
    await expect(f.control.audit({ ...owner, capabilities: [] })).rejects.toThrow('OWNER_CAPABILITY_DENIED')
  })
})
