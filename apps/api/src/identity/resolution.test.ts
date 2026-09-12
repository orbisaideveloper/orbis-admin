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

const verifiedObservation = (
  overrides: Partial<IdentityObservation> = {},
) => observation({
  phoneAssurance: 'verified',
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
    expect(normalizePhone('+---', '+91')).toBe('')
  })

  it('emits only non-empty identifiers with explicit assurance', () => {
    expect(observationIdentifiers(observation({
      phone: '---',
      email: ' Raju@Example.com ',
      emailAssurance: 'verified',
    }))).toEqual([{
      kind: 'email',
      normalizedValue: 'raju@example.com',
      assurance: 'verified',
    }])

    expect(observationIdentifiers(observation({
      phone: undefined,
      email: '   ',
    }))).toEqual([])

    expect(observationIdentifiers(observation())).toEqual([{
      kind: 'phone',
      normalizedValue: '+919876543210',
      assurance: 'observed',
    }])
  })
})

describe('identity resolution', () => {
  it('starts a provisional identity when only unverified data is observed', () => {
    expect(resolveIdentityObservation(
      observation({ phone: undefined }),
      [],
    )).toEqual({
      outcome: 'create_provisional',
      matchedOrbisIdentityId: null,
      candidateOrbisIdentityIds: [],
      reason: 'no_strong_identifier',
    })

    expect(resolveIdentityObservation(observation(), [identity()]))
      .toMatchObject({
        outcome: 'create_provisional',
        reason: 'no_strong_identifier',
      })
  })

  it('starts a provisional identity when no verified identifier matches', () => {
    expect(resolveIdentityObservation(
      verifiedObservation(),
      [],
    )).toMatchObject({
      outcome: 'create_provisional',
      reason: 'no_match',
    })

    expect(resolveIdentityObservation(
      verifiedObservation(),
      [identity({
        identifiers: [{
          kind: 'phone',
          normalizedValue: '+919876543210',
          assurance: 'observed',
        }],
      })],
    )).toMatchObject({
      outcome: 'create_provisional',
      reason: 'no_match',
    })
  })

  it('matches only one active identity with the same verified identifier', () => {
    const result = resolveIdentityObservation(verifiedObservation(), [
      identity(),
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

  it('follows a controlled merged redirect to its active identity', () => {
    const sourceIdentity = identity({
      orbisIdentityId: '01992aa0-0000-7000-8000-000000000002',
      lifecycle: 'merged',
      mergedIntoOrbisIdentityId: '01992aa0-0000-7000-8000-000000000001',
    })

    expect(resolveIdentityObservation(
      verifiedObservation(),
      [sourceIdentity, identity()],
    )).toMatchObject({
      outcome: 'match',
      matchedOrbisIdentityId: '01992aa0-0000-7000-8000-000000000001',
    })
  })

  it('requires review if a merged redirect is incomplete or cyclic', () => {
    const missingTarget = identity({
      lifecycle: 'merged',
      mergedIntoOrbisIdentityId: '01992aa0-0000-7000-8000-000000000099',
    })

    expect(resolveIdentityObservation(
      verifiedObservation(),
      [missingTarget],
    )).toMatchObject({
      outcome: 'review_required',
      reason: 'lifecycle_conflict',
    })

    const first = identity({
      lifecycle: 'merged',
      mergedIntoOrbisIdentityId: '01992aa0-0000-7000-8000-000000000002',
    })
    const second = identity({
      orbisIdentityId: '01992aa0-0000-7000-8000-000000000002',
      lifecycle: 'merged',
      mergedIntoOrbisIdentityId: '01992aa0-0000-7000-8000-000000000001',
    })

    expect(resolveIdentityObservation(
      verifiedObservation(),
      [first, second],
    )).toMatchObject({
      outcome: 'review_required',
      reason: 'lifecycle_conflict',
    })
  })

  it('requires review when verified identifiers point to multiple identities', () => {
    const result = resolveIdentityObservation(verifiedObservation(), [
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
    expect(resolveIdentityObservation(verifiedObservation(), [
      identity({ subjectKind: 'organization' }),
    ])).toMatchObject({
      outcome: 'review_required',
      reason: 'subject_kind_conflict',
    })
  })

  it('requires review instead of duplicating a suspended identity', () => {
    expect(resolveIdentityObservation(verifiedObservation(), [
      identity({ lifecycle: 'suspended' }),
    ])).toMatchObject({
      outcome: 'review_required',
      reason: 'lifecycle_conflict',
    })
  })
})
