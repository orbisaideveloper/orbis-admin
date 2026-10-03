import { OwnerAccessError } from './owner.js'

/** Uses Fastify's socket peer address, never an untrusted forwarded header. */
export const createOwnerRateLimit = (now = Date.now) => {
  const peers = new Map<string, { count: number; expires: number }>()
  return (peer: string) => {
    const time = now()
    for (const [key, value] of peers) {
      if (value.expires <= time) peers.delete(key)
    }
    const current = peers.get(peer)
    if (current) {
      if (current.count >= 30) throw new OwnerAccessError(429, 'OWNER_RATE_LIMIT')
      current.count++
      return
    }
    if (peers.size >= 500) throw new OwnerAccessError(429, 'OWNER_RATE_LIMIT')
    peers.set(peer, { count: 1, expires: time + 60_000 })
  }
}
