import type {
  EnvironmentKind,
  ProjectLifecycle,
  ProjectProviderRegistration,
  ProjectRegistryProject,
  ProjectRegistryResponse,
  ProjectSignals,
  SignalState,
} from '@orbis-admin/contracts'

type FixtureRow = readonly [
  id: string,
  name: string,
  kind: string,
  lifecycle: ProjectLifecycle,
  repository: string | null,
  environmentKind: EnvironmentKind,
  environmentLabel: string,
  userMode: string,
  userCount: number | null,
  modules: number | null,
  providers: ProjectProviderRegistration,
  signals: ProjectSignals,
]

const signalSet = (
  ci: SignalState,
  quality: SignalState,
  deployment: SignalState,
  health: SignalState,
): ProjectSignals => ({
  ci,
  quality,
  deployment,
  health,
})

const toFixtureProject = ([
  id,
  name,
  kind,
  lifecycle,
  repository,
  environmentKind,
  environmentLabel,
  userMode,
  userCount,
  modules,
  providers,
  signals,
]: FixtureRow): ProjectRegistryProject => ({
  id,
  name,
  kind,
  lifecycle,
  repository,
  environment: {
    kind: environmentKind,
    label: environmentLabel,
  },
  release: {
    current: null,
    published: null,
  },
  users: {
    mode: userMode,
    count: userCount,
  },
  modules,
  providers,
  signals,
})

const fixtureRows: readonly FixtureRow[] = [
  [
    'orbis-admin',
    'ORBIS Admin',
    'Control Plane',
    'active',
    'orbisaideveloper/orbis-admin',
    'staging',
    'Staging',
    'owner-only',
    null,
    null,
    {
      github: {
        repositoryFullName: 'orbisaideveloper/orbis-admin',
        defaultBranch: 'main',
      },
    },
    signalSet('unknown', 'unknown', 'unknown', 'unknown'),
  ],
  [
    'orbis-foundation',
    'ORBIS Foundation',
    'Product Platform',
    'external',
    'orbisaideveloper/orbis-foundation',
    'external',
    'Existing product',
    'external',
    42,
    4,
    {},
    signalSet('attention', 'attention', 'unknown', 'healthy'),
  ],
  [
    'orbis-game',
    'ORBIS Game',
    'Future Product',
    'planned',
    null,
    'planned',
    'Planned',
    'not-connected',
    null,
    null,
    {},
    signalSet('planned', 'planned', 'planned', 'planned'),
  ],
]

export const projectRegistryFixture: ProjectRegistryResponse = {
  schemaVersion: 'v1',
  generatedAt: '2026-09-11T17:30:00.000Z',
  projects: fixtureRows.map(toFixtureProject),
}
