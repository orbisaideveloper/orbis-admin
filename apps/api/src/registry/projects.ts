import type {
  GitHubRegistration,
  ProjectRegistryProject,
  ProjectRegistryResponse,
  RenderRegistration,
} from '@orbis-admin/contracts'
import {
  createGitHubReader,
  type GitHubReadState,
} from '../providers/github.js'
import {
  createRenderReader,
  type RenderReadState,
} from '../providers/render.js'

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

type GitHubProjectReader = (
  registration: GitHubRegistration,
) => Promise<GitHubReadState>

type RenderProjectReader = (
  registration: RenderRegistration,
) => Promise<RenderReadState>

const withGitHubState = (
  project: ProjectRegistryProject,
  githubState: GitHubReadState,
): ProjectRegistryProject => ({
  ...project,
  signals: {
    ...project.signals,
    ci: githubState.ci,
  },
})

const withRenderState = (
  project: ProjectRegistryProject,
  renderState: RenderReadState,
): ProjectRegistryProject => ({
  ...project,
  signals: {
    ...project.signals,
    deployment: renderState.deployment,
  },
})

export const readProjectRegistry = async (
  now: Date = new Date(),
  readGitHub?: GitHubProjectReader,
  readRender?: RenderProjectReader,
): Promise<ProjectRegistryResponse> => {
  const githubReader =
    readGitHub ??
    createGitHubReader({
      token: process.env.ORBIS_GITHUB_TOKEN,
    })

  const renderReader =
    readRender ??
    createRenderReader({
      token: process.env.ORBIS_RENDER_TOKEN,
    })

  const projects = await Promise.all(
    registeredProjects.map(async (project) => {
      let enrichedProject: ProjectRegistryProject = project

      if ('github' in project.providers) {
        const githubState = await githubReader(
          project.providers.github,
        )

        enrichedProject = withGitHubState(
          enrichedProject,
          githubState,
        )
      }

      if ('render' in project.providers) {
        const renderState = await renderReader(
          project.providers.render,
        )

        enrichedProject = withRenderState(
          enrichedProject,
          renderState,
        )
      }

      return enrichedProject
    }),
  )

  return {
    schemaVersion: 'v1',
    generatedAt: now.toISOString(),
    projects,
  }
}

export const createProjectRegistryReader = (
  readGitHub: GitHubProjectReader = createGitHubReader({
    token: process.env.ORBIS_GITHUB_TOKEN,
  }),
  readRender: RenderProjectReader = createRenderReader({
    token: process.env.ORBIS_RENDER_TOKEN,
  }),
) => {
  return () =>
    readProjectRegistry(
      new Date(),
      readGitHub,
      readRender,
    )
}
