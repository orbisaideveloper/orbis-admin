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

export const commandAreas: CommandArea[] = [
  {
    id: 'projects',
    title: 'Projects',
    eyebrow: 'Registry',
    summary: 'All ORBIS products, health and operational state.',
    metric: '3 tracked',
    tone: 'healthy',
  },
  {
    id: 'modules',
    title: 'Modules / Models',
    eyebrow: 'Inventory',
    summary: 'Cross-project modules and current/published state.',
    metric: 'Demo view',
    tone: 'healthy',
  },
  {
    id: 'users',
    title: 'Central Users',
    eyebrow: 'Identity',
    summary: 'Permanent ORBIS identity registry — next major phase.',
    metric: 'Planned',
    tone: 'planned',
  },
  {
    id: 'github',
    title: 'GitHub Actions',
    eyebrow: 'Quality gate',
    summary: 'Required checks and workflow health across projects.',
    metric: 'Ready',
    tone: 'healthy',
  },
  {
    id: 'sonar',
    title: 'Sonar Quality',
    eyebrow: 'Code health',
    summary: 'Quality Gate, coverage, duplication and issue signals.',
    metric: 'First scan pending',
    tone: 'attention',
  },
  {
    id: 'render',
    title: 'Render / Deployments',
    eyebrow: 'Runtime',
    summary: 'Service and deployment visibility for registered apps.',
    metric: 'Setup later',
    tone: 'planned',
  },
  {
    id: 'environments',
    title: 'Environments',
    eyebrow: 'Delivery',
    summary: 'Preview, staging and production state.',
    metric: '3 lanes',
    tone: 'healthy',
  },
  {
    id: 'review',
    title: 'Review / Publish Queue',
    eyebrow: 'Control',
    summary: 'Future owner approvals for releases and publish actions.',
    metric: 'Read-only V1',
    tone: 'planned',
  },
  {
    id: 'alerts',
    title: 'Alerts / Incidents',
    eyebrow: 'Attention',
    summary: 'Failed, degraded or blocked operational signals.',
    metric: '1 attention',
    tone: 'attention',
  },
  {
    id: 'health',
    title: 'API / Service Health',
    eyebrow: 'Availability',
    summary: 'Registered health endpoints and service summaries.',
    metric: '/health ready',
    tone: 'healthy',
  },
  {
    id: 'activity',
    title: 'Activity / Audit',
    eyebrow: 'Traceability',
    summary: 'Future administrative history and audit trail.',
    metric: 'Visual shell',
    tone: 'planned',
  },
  {
    id: 'settings',
    title: 'Settings / Integrations',
    eyebrow: 'Configuration',
    summary: 'Registry and provider integration configuration shell.',
    metric: 'Safe V1',
    tone: 'healthy',
  },
]

export const projects: ProjectSummary[] = [
  {
    id: 'orbis-admin',
    name: 'ORBIS Admin',
    kind: 'Control Plane',
    repository: 'orbisaideveloper/orbis-admin',
    environment: 'Development',
    version: 'Step 4',
    publishedVersion: 'Not deployed',
    quality: 'healthy',
    health: 'healthy',
    modules: 1,
    users: 'Owner only',
    githubUrl: 'https://github.com/orbisaideveloper/orbis-admin',
  },
  {
    id: 'orbis-foundation',
    name: 'ORBIS Foundation',
    kind: 'Product Platform',
    repository: 'orbisaideveloper/orbis-foundation',
    environment: 'Existing product',
    version: 'External',
    publishedVersion: 'External',
    quality: 'attention',
    health: 'healthy',
    modules: 0,
    users: 'External',
  },
  {
    id: 'orbis-game',
    name: 'ORBIS Game',
    kind: 'Future Product',
    repository: 'Not registered',
    environment: 'Planned',
    version: 'Planned',
    publishedVersion: 'Planned',
    quality: 'planned',
    health: 'planned',
    modules: 0,
    users: 'Not connected',
  },
]

export const findCommandArea = (id: string) => commandAreas.find((area) => area.id === id)

export const findProject = (id: string) => projects.find((project) => project.id === id)

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
