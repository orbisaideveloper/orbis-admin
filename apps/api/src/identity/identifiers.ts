import { randomBytes } from 'node:crypto'
import type { IdentitySubjectKind } from '@orbis-admin/contracts'

const uuidHex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')

export const createUuidV7 = (
  now: number = Date.now(),
  entropy: Uint8Array = randomBytes(10),
) => {
  if (!Number.isSafeInteger(now) || now < 0 || now > 0xffffffffffff) {
    throw new RangeError('UUIDv7 timestamp must fit in 48 bits')
  }

  if (entropy.length !== 10) {
    throw new RangeError('UUIDv7 entropy must contain 10 bytes')
  }

  const bytes = new Uint8Array(16)
  let timestamp = BigInt(now)

  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number(timestamp & 0xffn)
    timestamp >>= 8n
  }

  bytes.set(entropy, 6)
  bytes[6] = (bytes[6] & 0x0f) | 0x70
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = uuidHex(bytes)

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}

const displayAlphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

export const createIdentityDisplayId = (
  subjectKind: IdentitySubjectKind,
  entropy: Uint8Array = randomBytes(8),
) => {
  if (entropy.length !== 8) {
    throw new RangeError('Display ID entropy must contain 8 bytes')
  }

  const prefix = subjectKind === 'person' ? 'ORB-U-' : 'ORB-O-'
  const body = [...entropy]
    .map((byte) => displayAlphabet[byte % displayAlphabet.length])
    .join('')

  return `${prefix}${body}`
}
