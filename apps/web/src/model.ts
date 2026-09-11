export type StatusTone = 'healthy' | 'attention' | 'planned'

export type CommandArea = {
  id: string
  title: string
  eyebrow: string
  summary: string
  metric: string
  tone: StatusTone
}

export type ProjectSummary = {
  id: string
  name: string
  kind: string
  repository: string
  environment: string
  version: string
  publishedVersion: string
  quality: StatusTone
  health: StatusTone
  modules: number
  users: string
  githubUrl?: string
  sonarUrl?: string
  renderUrl?: string
}

const commandAreaSpecs: Record<string, string> = {
  projects: 'Projects\tRegistry\tAll ORBIS products, health and operational state.\t3 tracked\thealthy',
  modules: 'Modules / Models\tInventory\tCross-project modules and current/published state.\tDemo view\thealthy',
  users: 'Central Users\tIdentity\tPermanent ORBIS identity registry — next major phase.\tPlanned\tplanned',
  github: 'GitHub Actions\tQuality gate\tRequired checks and workflow health across projects.\tReady\thealthy',
  sonar: 'Sonar Quality\tCode health\tQuality Gate, coverage, duplication and issue signals.\tFirst scan pending\tattention',
  render: 'Render / Deployments\tRuntime\tService and deployment visibility for registered apps.\tSetup later\tplanned',
  environments: 'Environments\tDelivery\tPreview, staging and production state.\t3 lanes\thealthy',
  review: 'Review / Publish Queue\tControl\tFuture owner approvals for releases and publish actions.\tRead-only V1\tplanned',
  alerts: 'Alerts / Incidents\tAttention\tFailed, degraded or blocked operational signals.\t1 attention\tattention',
  health: 'API / Service Health\tAvailability\tRegistered health endpoints and service summaries.\t/health ready\thealthy',
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

const projectSpecs: Record<string, string> = {
  'orbis-admin': 'ORBIS Admin\tControl Plane\torbisaideveloper/orbis-admin\tDevelopment\tStep 4\tNot deployed\thealthy\thealthy\t1\tOwner only\thttps://github.com/orbisaideveloper/orbis-admin',
  'orbis-foundation': 'ORBIS Foundation\tProduct Platform\torbisaideveloper/orbis-foundation\tExisting product\tExternal\tExternal\tattention\thealthy\t0\tExternal\t',
  'orbis-game': 'ORBIS Game\tFuture Product\tNot registered\tPlanned\tPlanned\tPlanned\tplanned\tplanned\t0\tNot connected\t',
}

const projectFromSpec = ([id, spec]: [string, string]): ProjectSummary => {
  const [
    name,
    kind,
    repository,
    environment,
    version,
    publishedVersion,
    quality,
    health,
    modules,
    users,
    githubUrl,
  ] = spec.split('\t')

  return {
    id,
    name,
    kind,
    repository,
    environment,
    version,
    publishedVersion,
    quality: quality as StatusTone,
    health: health as StatusTone,
    modules: Number(modules),
    users,
    ...(githubUrl ? { githubUrl } : {}),
  }
}

export const projects: ProjectSummary[] =
  Object.entries(projectSpecs).map(projectFromSpec)

export const findCommandArea = (id: string) =>
  commandAreas.find((area) => area.id === id)

export const findProject = (id: string) =>
  projects.find((project) => project.id === id)

export const aggregateTone = (tones: StatusTone[]): StatusTone => {
  if (tones.includes('attention')) return 'attention'
  if (tones.every((tone) => tone === 'planned')) return 'planned'
  return 'healthy'
}

export const toneLabel = (tone: StatusTone) => {
  if (tone === 'attention') return 'Needs attention'
  if (tone === 'planned') return 'Planned'
  return 'Healthy'
}
