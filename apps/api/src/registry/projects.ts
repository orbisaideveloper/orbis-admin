import type {
  ProjectRegistryProject,
  ProjectRegistryResponse,
} from '@orbis-admin/contracts'

const unknownSignals = {
  ci: 'unknown',
  quality: 'unknown',
  deployment: 'unknown',
  health: 'unknown',
} as const

export const registeredProjects = [
  {
    id: 'orbis-admin',
    name: 'ORBIS Admin',
    kind: 'Control Plane',
    lifecycle: 'active',
    repository: 'orbisaideveloper/orbis-admin',
    environment: {
      kind: 'staging',
      label: 'Staging',
    },
    release: {
      current: null,
      published: null,
    },
    users: {
      mode: 'owner-only',
      count: null,
    },
    modules: null,
    providers: {
      github: {
        repositoryFullName: 'orbisaideveloper/orbis-admin',
        defaultBranch: 'main',
      },
      render: {
        serviceId: 'srv-dai144uq1p3s73ajc1ag',
        serviceName: 'orbis-admin-staging',
        branch: 'staging',
        region: 'singapore',
      },
      sonar: {
        projectKey: 'orbisaideveloper_orbis-admin',
        organization: 'orbis',
      },
      health: {
        path: '/health',
      },
    },
    signals: unknownSignals,
  },
  {
    id: 'orbis-foundation',
    name: 'ORBIS Foundation',
    kind: 'Product Platform',
    lifecycle: 'external',
    repository: 'orbisaideveloper/orbis-foundation',
    environment: {
      kind: 'external',
      label: 'Existing product',
    },
    release: {
      current: null,
      published: null,
    },
    users: {
      mode: 'external',
      count: null,
    },
    modules: null,
    providers: {
      github: {
        repositoryFullName: 'orbisaideveloper/orbis-foundation',
        defaultBranch: 'main',
      },
    },
    signals: unknownSignals,
  },
  {
    id: 'orbis-game',
    name: 'ORBIS Game',
    kind: 'Future Product',
    lifecycle: 'planned',
    repository: null,
    environment: {
      kind: 'planned',
      label: 'Planned',
    },
    release: {
      current: null,
      published: null,
    },
    users: {
      mode: 'not-connected',
      count: null,
    },
    modules: null,
    providers: {},
    signals: unknownSignals,
  },
] as const satisfies readonly ProjectRegistryProject[]

export const readProjectRegistry = (
  now: Date = new Date(),
): ProjectRegistryResponse => ({
  schemaVersion: 'v1',
  generatedAt: now.toISOString(),
  projects: registeredProjects,
})
