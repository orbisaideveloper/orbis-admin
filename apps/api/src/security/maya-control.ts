import { randomBytes } from 'node:crypto'
import { createUuidV7 } from '../identity/identifiers.js'
import { OwnerAccessError, requireMayaCapability, requireMayaWrites, type OwnerBinding } from './owner.js'

export type MayaAction = {
  actionId: string
  traceId: string
  actor: OwnerBinding
  revision: string
  requestedAt: string
}
export type MayaAuditStore = {
  claim: (action: MayaAction) => Promise<boolean>
  finish: (actionId: string, outcome: 'accepted' | 'unknown', deployId: string | null) => Promise<void>
  read: (owner: OwnerBinding) => Promise<unknown>
}
type ControlOptions = {
  audit: MayaAuditStore
  deploy: (revision: string) => Promise<string>
  switches: () => readonly (string | undefined)[]
  now?: () => number
}

/** Confirmation binds one owner, exact commit and fixed development scope. */
export const createMayaControl = (options: ControlOptions) => {
  const now = options.now ?? Date.now
  const pending = new Map<string, { action: MayaAction; expires: number }>()
  const authorize = (owner: OwnerBinding) => {
    requireMayaCapability(owner, 'development.deploy', 'orbis-maya', 'development')
    requireMayaWrites(options.switches())
  }
  return {
    prepare(owner: OwnerBinding, revision: string) {
      authorize(owner)
      if (!/^[0-9a-f]{40}$/.test(revision)) throw new OwnerAccessError(400, 'INVALID_REVISION')
      const time = now()
      for (const [key, value] of pending) {
        if (value.expires <= time) pending.delete(key)
      }
      if (pending.size >= 100) throw new OwnerAccessError(429, 'CONFIRMATION_LIMIT')
      const confirmation = randomBytes(32).toString('hex')
      const action: MayaAction = {
        actionId: createUuidV7(time), actor: owner, revision,
        traceId: randomBytes(16).toString('hex'),
        requestedAt: new Date(time).toISOString(),
      }
      pending.set(confirmation, { action, expires: time + 90_000 })
      return { confirmation, actionId: action.actionId, revision, expiresAt: time + 90_000 }
    },
    async execute(owner: OwnerBinding, confirmation: string) {
      authorize(owner)
      const prepared = pending.get(confirmation)
      if (!prepared || prepared.expires <= now() ||
        prepared.action.actor.authUserId !== owner.authUserId ||
        prepared.action.actor.orbisIdentityId !== owner.orbisIdentityId) {
        throw new OwnerAccessError(409, 'CONFIRMATION_INVALID')
      }
      // Consume synchronously before the first await; replay cannot reach the provider.
      pending.delete(confirmation)
      const { action } = prepared
      let claimed: boolean
      try { claimed = await options.audit.claim(action) } catch {
        throw new OwnerAccessError(503, 'AUDIT_UNAVAILABLE')
      }
      if (!claimed) throw new OwnerAccessError(409, 'ACTION_ALREADY_RECORDED')
      let deployId: string
      try { deployId = await options.deploy(action.revision) } catch {
        await options.audit.finish(action.actionId, 'unknown', null)
        throw new OwnerAccessError(502, 'DEPLOY_OUTCOME_UNKNOWN')
      }
      // A failed outcome write must not be reported as an unaudited successful action.
      try { await options.audit.finish(action.actionId, 'accepted', deployId) } catch {
        throw new OwnerAccessError(503, 'AUDIT_OUTCOME_PENDING')
      }
      return { actionId: action.actionId, traceId: action.traceId, deployId, state: 'accepted' as const }
    },
    async audit(owner: OwnerBinding) {
      requireMayaCapability(owner, 'audit.read', 'orbis-maya', 'development')
      return options.audit.read(owner)
    },
  }
}
