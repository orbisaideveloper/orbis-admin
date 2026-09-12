import type {
  IdentityIdentifier,
  IdentityObservation,
  IdentityResolution,
  OrbisIdentity,
} from '@orbis-admin/contracts'

const compactWhitespace = (value: string) =>
  value.trim().replace(/\s+/gu, ' ')

export const normalizeEmail = (value: string) =>
  compactWhitespace(value).toLocaleLowerCase('en-US')

export const normalizePhone = (
  value: string,
  defaultCountryCallingCode?: string,
) => {
  const trimmed = value.trim()
  const hasInternationalPrefix = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/gu, '')

  if (!digits) {
    return ''
  }

  if (hasInternationalPrefix || !defaultCountryCallingCode) {
    return hasInternationalPrefix ? `+${digits}` : digits
  }

  const countryDigits = defaultCountryCallingCode.replace(/\D/gu, '')
  const nationalDigits = digits.replace(/^0+/u, '')

  return countryDigits ? `+${countryDigits}${nationalDigits}` : digits
}

export const observationIdentifiers = (
  observation: IdentityObservation,
): readonly IdentityIdentifier[] => {
  const identifiers: IdentityIdentifier[] = []

  if (observation.phone) {
    const normalizedValue = normalizePhone(
      observation.phone,
      observation.phoneCountryCallingCode,
    )

    if (normalizedValue) {
      identifiers.push({
        kind: 'phone',
        normalizedValue,
        assurance: observation.phoneAssurance ?? 'observed',
      })
    }
  }

  if (observation.email) {
    const normalizedValue = normalizeEmail(observation.email)

    if (normalizedValue) {
      identifiers.push({
        kind: 'email',
        normalizedValue,
        assurance: observation.emailAssurance ?? 'observed',
      })
    }
  }

  return identifiers
}

const identifierKey = (identifier: IdentityIdentifier) =>
  `${identifier.kind}:${identifier.normalizedValue}`

const canonicalIdentityFor = (
  identity: OrbisIdentity,
  identitiesById: ReadonlyMap<string, OrbisIdentity>,
) => {
  const seenIdentityIds = new Set<string>()
  let current = identity

  while (current.lifecycle === 'merged') {
    if (
      !current.mergedIntoOrbisIdentityId
      || seenIdentityIds.has(current.orbisIdentityId)
    ) {
      return current
    }

    seenIdentityIds.add(current.orbisIdentityId)

    const target = identitiesById.get(
      current.mergedIntoOrbisIdentityId,
    )

    if (!target) {
      return current
    }

    current = target
  }

  return current
}

export const resolveIdentityObservation = (
  observation: IdentityObservation,
  identities: readonly OrbisIdentity[],
): IdentityResolution => {
  const observedIdentifiers = observationIdentifiers(observation)
  const verifiedObservedKeys = new Set(
    observedIdentifiers
      .filter(({ assurance }) => assurance === 'verified')
      .map(identifierKey),
  )

  if (verifiedObservedKeys.size === 0) {
    return {
      outcome: 'create_provisional',
      matchedOrbisIdentityId: null,
      candidateOrbisIdentityIds: [],
      reason: 'no_strong_identifier',
    }
  }

  const identitiesById = new Map(
    identities.map((identity) => [identity.orbisIdentityId, identity]),
  )
  const candidatesById = new Map<string, OrbisIdentity>()

  for (const identity of identities) {
    const hasVerifiedMatch = identity.identifiers.some(
      (identifier) =>
        identifier.assurance === 'verified'
        && verifiedObservedKeys.has(identifierKey(identifier)),
    )

    if (hasVerifiedMatch) {
      const canonicalIdentity = canonicalIdentityFor(
        identity,
        identitiesById,
      )
      candidatesById.set(
        canonicalIdentity.orbisIdentityId,
        canonicalIdentity,
      )
    }
  }

  const candidates = [...candidatesById.values()]

  if (candidates.length === 0) {
    return {
      outcome: 'create_provisional',
      matchedOrbisIdentityId: null,
      candidateOrbisIdentityIds: [],
      reason: 'no_match',
    }
  }

  const candidateIds = candidates.map(
    ({ orbisIdentityId }) => orbisIdentityId,
  )

  if (candidates.length > 1) {
    return {
      outcome: 'review_required',
      matchedOrbisIdentityId: null,
      candidateOrbisIdentityIds: candidateIds,
      reason: 'multiple_identifier_matches',
    }
  }

  const [candidate] = candidates

  if (candidate.subjectKind !== observation.subjectKind) {
    return {
      outcome: 'review_required',
      matchedOrbisIdentityId: null,
      candidateOrbisIdentityIds: candidateIds,
      reason: 'subject_kind_conflict',
    }
  }

  if (candidate.lifecycle !== 'active') {
    return {
      outcome: 'review_required',
      matchedOrbisIdentityId: null,
      candidateOrbisIdentityIds: candidateIds,
      reason: 'lifecycle_conflict',
    }
  }

  return {
    outcome: 'match',
    matchedOrbisIdentityId: candidate.orbisIdentityId,
    candidateOrbisIdentityIds: candidateIds,
    reason: 'single_identifier_match',
  }
}
