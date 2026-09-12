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

  if (hasInternationalPrefix || !defaultCountryCallingCode || !digits) {
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
        assurance: 'observed',
      })
    }
  }

  if (observation.email) {
    const normalizedValue = normalizeEmail(observation.email)

    if (normalizedValue) {
      identifiers.push({
        kind: 'email',
        normalizedValue,
        assurance: 'observed',
      })
    }
  }

  return identifiers
}

const identifierKey = (identifier: IdentityIdentifier) =>
  `${identifier.kind}:${identifier.normalizedValue}`

export const resolveIdentityObservation = (
  observation: IdentityObservation,
  identities: readonly OrbisIdentity[],
): IdentityResolution => {
  const observedIdentifiers = observationIdentifiers(observation)

  if (observedIdentifiers.length === 0) {
    return {
      outcome: 'create_provisional',
      matchedOrbisIdentityId: null,
      candidateOrbisIdentityIds: [],
      reason: 'no_strong_identifier',
    }
  }

  const observedKeys = new Set(observedIdentifiers.map(identifierKey))
  const candidates = identities.filter(
    (identity) =>
      identity.lifecycle !== 'merged' &&
      identity.identifiers.some((identifier) =>
        observedKeys.has(identifierKey(identifier)),
      ),
  )

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

  return {
    outcome: 'match',
    matchedOrbisIdentityId: candidate.orbisIdentityId,
    candidateOrbisIdentityIds: candidateIds,
    reason: 'single_identifier_match',
  }
}
