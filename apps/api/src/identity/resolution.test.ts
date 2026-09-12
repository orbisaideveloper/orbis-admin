import type {
  IdentityObservation,
  OrbisIdentity,
} from '@orbis-admin/contracts'
import { describe, expect, it } from 'vitest'
import {
  normalizeEmail,
  normalizePhone,
  observationIdentifiers,
  resolveIdentityObservation,
} from './resolution.js'

const source = {
  projectId: 'orbis-accounting',
  localEntityType: 'party',
  localEntityId: 'party-1',
  roles: ['customer'],
} as const

const observation = (
  overrides: Partial<IdentityObservation> = {},
): IdentityObservation => ({
  subjectKind: 'person',
  displayName: 'Raju Das',
  phone: '+91 98765 43210',
  source,
  ...overrides,
})

const identity = (
  overrides: Partial<OrbisIdentity> = {},
): OrbisIdentity => ({
  orbisIdentityId: '01992aa0-0000-7000-8000-000000000001',
  displayId: 'ORB-U-7K4M92QX',
  subjectKind: 'person',
  lifecycle: 'active',
  displayName: 'Raju Das',
  identifiers: [{
    kind: 'phone',
    normalizedValue: '+919876543210',
    assurance: 'verified',
  }],
  productReferences: [],
  mergedIntoOrbisIdentityId: null,
  createdAt: '2026-09-12T00:00:00.000Z',
  updatedAt: '2026-09-12T00:00:00.000Z',
  ...overrides,
})

describe('identity normalization', () => {
  it('normalizes email case and whitespace', () => {
    expect(normalizeEmail('  RAJU@Example.COM  ')).toBe('raju@example.com')
  })

  it('normalizes local and international phone values', () => {
    expect(normalizePhone('+91 (98765) 43210')).toBe('+919876543210')
    expect(normalizePhone('09876-543210')).toBe('09876543210')
    expect(normalizePhone('09876-543210', '+91')).toBe('+919876543210')
    expect(normalizePhone('09876-543210', '---')).toBe('09876543210')
  })

  it('emits only non-empty observed identifiers', () => {
    expect(observationIdentifiers(observation({
      phone: '---',
      email: ' Raju@Example.com ',
    }))).toEqual([{
      kind: 'email',
      normalizedValue: 'raju@example.com',
      assurance: 'observed',
    }])

    expect(observationIdentifiers(observation({
      phone: undefined,
      email: '   ',
    }))).toEqual([])
  })
})

describe('identity resolution', () => {
  it('starts a provisional identity when only a name is observed', () => {
    expect(resolveIdentityObservation(
      observation({ phone: undefined }),
      [],
    )).toEqual({
      outcome: 'create_provisional',
      matchedOrbisIdentityId: null,
      candidateOrbisIdentityIds: [],
      reason: 'no_strong_identifier',
    })
  })

  it('starts a provisional identity when no identifier matches', () => {
    expect(resolveIdentityObservation(observation(), [])).toMatchObject({
      outcome: 'create_provisional',
      reason: 'no_match',
    })
  })

  it('matches one non-merged identity by normalized identifier', () => {
    const result = resolveIdentityObservation(observation(), [
      identity(),
      identity({
        orbisIdentityId: '01992aa0-0000-7000-8000-000000000002',
        lifecycle: 'merged',
      }),
    ])

    expect(result).toEqual({
      outcome: 'match',
      matchedOrbisIdentityId: '01992aa0-0000-7000-8000-000000000001',
      candidateOrbisIdentityIds: [
        '01992aa0-0000-7000-8000-000000000001',
      ],
      reason: 'single_identifier_match',
    })
  })

  it('requires review when identifiers point to multiple identities', () => {
    const result = resolveIdentityObservation(observation(), [
      identity(),
      identity({
        orbisIdentityId: '01992aa0-0000-7000-8000-000000000002',
      }),
    ])

    expect(result).toMatchObject({
      outcome: 'review_required',
      matchedOrbisIdentityId: null,
      reason: 'multiple_identifier_matches',
    })
  })

  it('requires review instead of joining a person to an organization', () => {
    expect(resolveIdentityObservation(observation(), [
      identity({ subjectKind: 'organization' }),
    ])).toMatchObject({
      outcome: 'review_required',
      reason: 'subject_kind_conflict',
    })
  })
})
