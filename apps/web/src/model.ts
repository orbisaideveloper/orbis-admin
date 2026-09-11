import type {
  ProjectRegistryProject,
  SignalState,
} from '@orbis-admin/contracts'

export type StatusTone = SignalState

export type CommandArea = {
  id: string
  title: string
  eyebrow: string
  summary: string
  metric: string
  tone: StatusTone
}

const commandAreaSpecs: Record<string, string> = {
  projects: 'Projects\tRegistry\tAll ORBIS products, health and operational state.\tAPI-backed registry\thealthy',
  modules: 'Modules / Models\tInventory\tCross-project modules and current/published state.\tRead model\tunknown',
  users: 'Central Users\tIdentity\tPermanent ORBIS identity registry — later phase.\tDeferred\tplanned',
  github: 'GitHub Actions\tQuality gate\tRead-only provider integration follows the registry foundation.\tAdapter next\tunknown',
  sonar: 'Sonar Quality\tCode health\tRead-only quality integration follows the provider adapter boundary.\tAdapter queued\tunknown',
  render: 'Render / Deployments\tRuntime\tRead-only deployment integration follows the provider adapter boundary.\tAdapter queued\tunknown',
  environments: 'Environments\tDelivery\tEnvironment state will be normalized from registered providers.\tRegistry ready\tunknown',
  review: 'Review / Publish Queue\tControl\tFuture owner approvals for releases and publish actions.\tRead-only V1\tplanned',
  alerts: 'Alerts / Incidents\tAttention\tUnified alerts will derive from provider signals.\tProvider data pending\tunknown',
  health: 'API / Service Health\tAvailability\tRegistered health endpoints and service summaries.\t/health contract\thealthy',
  activity: 'Activity / Audit\tTraceability\tFuture administrative history and audit trail.\tVisual shell\tplanned',
  settings: 'Settings / Integrations\tConfiguration\tRegistry and provider integration configuration shell.\tSafe V1\thealthy',
}

const commandAreaFromSpec = ([id, spec]: [string, string]): CommandArea => {
  const [title, eyebrow, summary, metric, tone] = spec.split('\t')

  return {
    id,
    title,
    eyebrow,
    summary,
    metric,
    tone: tone as StatusTone,
  }
}

export const commandAreas: CommandArea[] =
  Object.entries(commandAreaSpecs).map(commandAreaFromSpec)

export const findCommandArea = (id: string) =>
  commandAreas.find((area) => area.id === id)

export const findProject = (
  projects: readonly ProjectRegistryProject[],
  id: string,
) => projects.find((project) => project.id === id)

export const aggregateTone = (tones: StatusTone[]): StatusTone => {
  if (tones.includes('attention')) return 'attention'
  if (tones.includes('unknown')) return 'unknown'
  if (tones.every((tone) => tone === 'planned')) return 'planned'
  return 'healthy'
}

export const toneLabel = (tone: StatusTone) => {
  if (tone === 'attention') return 'Needs attention'
  if (tone === 'planned') return 'Planned'
  if (tone === 'unknown') return 'Unknown'
  return 'Healthy'
}

export const repositoryLabel = (project: ProjectRegistryProject) =>
  project.repository ?? 'Not registered'

export const releaseLabel = (value: string | null) =>
  value ?? 'Not reported'

export const modulesLabel = (value: number | null) =>
  value === null ? 'Not reported' : String(value)

export const usersLabel = (project: ProjectRegistryProject) =>
  project.users.count === null
    ? project.users.mode.replaceAll('-', ' ')
    : String(project.users.count)

export const githubRepositoryUrl = (
  project: ProjectRegistryProject,
): string | undefined => {
  const registration = project.providers.github
  if (!registration) return undefined
  return `https://github.com/${registration.repositoryFullName}`
}
