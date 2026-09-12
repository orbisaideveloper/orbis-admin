export const projectLifecycleValues = [
  'active',
  'external',
  'planned',
] as const

export type ProjectLifecycle = (typeof projectLifecycleValues)[number]

export const environmentKindValues = [
  'development',
  'staging',
  'production',
  'external',
  'planned',
] as const

export type EnvironmentKind = (typeof environmentKindValues)[number]

export const signalStateValues = [
  'healthy',
  'attention',
  'planned',
  'unknown',
] as const

export type SignalState = (typeof signalStateValues)[number]

export type GitHubRegistration = {
  repositoryFullName: string
  defaultBranch: string
}

export type RenderRegistration = {
  serviceId: string
  serviceName: string
  branch: string
  region: string
}

export type SonarRegistration = {
  projectKey: string
  organization: string
}

export type HealthRegistration = {
  path: string
}

export type ProjectProviderRegistration = {
  github?: GitHubRegistration
  render?: RenderRegistration
  sonar?: SonarRegistration
  health?: HealthRegistration
}

export type ProjectSignals = {
  ci: SignalState
  quality: SignalState
  deployment: SignalState
  health: SignalState
}

export type ProjectRegistryProject = {
  id: string
  name: string
  kind: string
  lifecycle: ProjectLifecycle
  repository: string | null
  environment: {
    kind: EnvironmentKind
    label: string
  }
  release: {
    current: string | null
    published: string | null
  }
  users: {
    mode: string
    count: number | null
  }
  modules: number | null
  providers: ProjectProviderRegistration
  signals: ProjectSignals
}

export type ProjectRegistryResponse = {
  schemaVersion: 'v1'
  generatedAt: string
  projects: readonly ProjectRegistryProject[]
}

const nullableStringSchema = {
  anyOf: [
    { type: 'string' },
    { type: 'null' },
  ],
} as const

const signalSchema = {
  type: 'string',
  enum: signalStateValues,
} as const

export const projectRegistryResponseSchema = {
  $id: 'ProjectRegistryResponseV1',
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'generatedAt', 'projects'],
  properties: {
    schemaVersion: {
      type: 'string',
      const: 'v1',
    },
    generatedAt: {
      type: 'string',
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id',
          'name',
          'kind',
          'lifecycle',
          'repository',
          'environment',
          'release',
          'users',
          'modules',
          'providers',
          'signals',
        ],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          kind: { type: 'string' },
          lifecycle: {
            type: 'string',
            enum: projectLifecycleValues,
          },
          repository: nullableStringSchema,
          environment: {
            type: 'object',
            additionalProperties: false,
            required: ['kind', 'label'],
            properties: {
              kind: {
                type: 'string',
                enum: environmentKindValues,
              },
              label: { type: 'string' },
            },
          },
          release: {
            type: 'object',
            additionalProperties: false,
            required: ['current', 'published'],
            properties: {
              current: nullableStringSchema,
              published: nullableStringSchema,
            },
          },
          users: {
            type: 'object',
            additionalProperties: false,
            required: ['mode', 'count'],
            properties: {
              mode: { type: 'string' },
              count: {
                anyOf: [
                  { type: 'number' },
                  { type: 'null' },
                ],
              },
            },
          },
          modules: {
            anyOf: [
              { type: 'number' },
              { type: 'null' },
            ],
          },
          providers: {
            type: 'object',
            additionalProperties: false,
            properties: {
              github: {
                type: 'object',
                additionalProperties: false,
                required: ['repositoryFullName', 'defaultBranch'],
                properties: {
                  repositoryFullName: { type: 'string' },
                  defaultBranch: { type: 'string' },
                },
              },
              render: {
                type: 'object',
                additionalProperties: false,
                required: [
                  'serviceId',
                  'serviceName',
                  'branch',
                  'region',
                ],
                properties: {
                  serviceId: { type: 'string' },
                  serviceName: { type: 'string' },
                  branch: { type: 'string' },
                  region: { type: 'string' },
                },
              },
              sonar: {
                type: 'object',
                additionalProperties: false,
                required: ['projectKey', 'organization'],
                properties: {
                  projectKey: { type: 'string' },
                  organization: { type: 'string' },
                },
              },
              health: {
                type: 'object',
                additionalProperties: false,
                required: ['path'],
                properties: {
                  path: { type: 'string' },
                },
              },
            },
          },
          signals: {
            type: 'object',
            additionalProperties: false,
            required: ['ci', 'quality', 'deployment', 'health'],
            properties: {
              ci: signalSchema,
              quality: signalSchema,
              deployment: signalSchema,
              health: signalSchema,
            },
          },
        },
      },
    },
  },
} as const
