import { describe, expect, it } from 'vitest'
import {
  createIdentityDisplayId,
  createUuidV7,
} from './identifiers.js'

describe('canonical identity identifiers', () => {
  it('creates a deterministic RFC 9562 UUIDv7 with correct version and variant', () => {
    const value = createUuidV7(
      1_725_000_000_000,
      Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    )

    expect(value).toBe('0191a203-2200-7001-8203-040506070809')
    expect(value[14]).toBe('7')
    expect(['8', '9', 'a', 'b']).toContain(value[19])
  })

  it('rejects invalid UUIDv7 timestamp and entropy', () => {
    expect(() => createUuidV7(-1, new Uint8Array(10))).toThrow(RangeError)
    expect(() => createUuidV7(0, new Uint8Array(9))).toThrow(RangeError)
  })

  it('creates distinct person and organization display prefixes', () => {
    const entropy = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7])

    expect(createIdentityDisplayId('person', entropy)).toBe('ORB-U-23456789')
    expect(createIdentityDisplayId('organization', entropy)).toBe('ORB-O-23456789')
  })

  it('rejects display ID entropy with an invalid size', () => {
    expect(() => createIdentityDisplayId(
      'person',
      new Uint8Array(7),
    )).toThrow(RangeError)
  })
})
