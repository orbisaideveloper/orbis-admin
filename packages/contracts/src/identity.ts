export const identitySubjectKindValues = [
  'person',
  'organization',
] as const

export type IdentitySubjectKind =
  (typeof identitySubjectKindValues)[number]

export const identityLifecycleValues = [
  'provisional',
  'active',
  'suspended',
  'merged',
] as const

export type IdentityLifecycle =
  (typeof identityLifecycleValues)[number]

export const identityIdentifierKindValues = [
  'email',
  'phone',
] as const

export type IdentityIdentifierKind =
  (typeof identityIdentifierKindValues)[number]

export const identityIdentifierAssuranceValues = [
  'observed',
  'verified',
] as const

export type IdentityIdentifierAssurance =
  (typeof identityIdentifierAssuranceValues)[number]

export type IdentityIdentifier = {
  kind: IdentityIdentifierKind
  normalizedValue: string
  assurance: IdentityIdentifierAssurance
}

export type ProductIdentityReference = {
  projectId: string
  localEntityType: string
  localEntityId: string
  roles: readonly string[]
}

export type IdentityActionContext = {
  orbisActionId: string
  sourceProjectId: string
  idempotencyKey: string
  actorKind: 'product_service' | 'admin_service' | 'system'
  actorReference: string
}

export type OrbisIdentity = {
  orbisIdentityId: string
  displayId: string
  subjectKind: IdentitySubjectKind
  lifecycle: IdentityLifecycle
  displayName: string
  identifiers: readonly IdentityIdentifier[]
  productReferences: readonly ProductIdentityReference[]
  mergedIntoOrbisIdentityId: string | null
  createdAt: string
  updatedAt: string
}

export type IdentityObservation = {
  subjectKind: IdentitySubjectKind
  displayName: string
  phone?: string
  phoneAssurance?: IdentityIdentifierAssurance
  phoneCountryCallingCode?: string
  email?: string
  emailAssurance?: IdentityIdentifierAssurance
  source: ProductIdentityReference
}

export const identityResolutionOutcomeValues = [
  'create_provisional',
  'match',
  'review_required',
] as const

export type IdentityResolutionOutcome =
  (typeof identityResolutionOutcomeValues)[number]

export type IdentityResolution = {
  outcome: IdentityResolutionOutcome
  matchedOrbisIdentityId: string | null
  candidateOrbisIdentityIds: readonly string[]
  reason:
    | 'no_strong_identifier'
    | 'no_match'
    | 'single_identifier_match'
    | 'multiple_identifier_matches'
    | 'subject_kind_conflict'
    | 'lifecycle_conflict'
}
