import { describe, expect, it } from 'vitest'
import { createOwnerRateLimit } from './control-rate.js'
describe('bounded owner authentication rate limit', () => {
  it('allows 30 requests per peer, rejects excess and expires the window', () => {
    let time = 0
    const limit = createOwnerRateLimit(() => time)
    for (let i = 0; i < 30; i++) limit('peer')
    expect(() => limit('peer')).toThrow('OWNER_RATE_LIMIT')
    expect(() => limit('other')).not.toThrow()
    time = 60_000
    expect(() => limit('peer')).not.toThrow()
  })
  it('bounds peer storage rather than accepting unlimited attacker identities', () => {
    const limit = createOwnerRateLimit(() => 0)
    for (let i = 0; i < 500; i++) limit(String(i))
    expect(() => limit('another')).toThrow('OWNER_RATE_LIMIT')
  })
})
