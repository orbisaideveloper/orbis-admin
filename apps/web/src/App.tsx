import { useEffect, useState } from 'react'
import './App.css'

type Route =
  | 'home'
  | 'projects'
  | 'foundation'
  | 'actions'
  | 'sonar'
  | 'render'
  | 'users'
  | 'settings'
  | 'activity'
  | 'review'
  | 'alerts'
  | 'health'
  | 'foundation-actions'
  | 'foundation-sonar'
  | 'foundation-render'
  | 'foundation-runtime'
  | 'foundation-modules'
  | 'foundation-users'
  | 'foundation-versions'
  | 'foundation-quality'

type Tone = 'healthy' | 'info' | 'warning' | 'danger' | 'muted'

type CardData = {
  eyebrow: string
  value: string
  title: string
  description: string
  status: string
  tone: Tone
  route: Route
  variant?: 'primary' | 'standard'
}

type ProjectData = {
  name: string
  kind: string
  status: string
  tone: Tone
  actionStatus: string
  route?: Route
}

const homeCards: CardData[] = [
  {
    eyebrow: 'PRIMARY',
    value: '01',
    title: 'Projects',
    description: 'All ORBIS projects and their admin control areas',
    status: 'OPEN CONTROL',
    tone: 'info',
    route: 'projects',
    variant: 'primary',
  },
  {
    eyebrow: 'CI STATUS',
    value: 'GREEN',
    title: 'GitHub Actions',
    description: 'Required checks across registered projects',
    status: 'ALL HEALTHY',
    tone: 'healthy',
    route: 'actions',
  },
  {
    eyebrow: 'QUALITY',
    value: 'PASS',
    title: 'Sonar Quality',
    description: 'Cross-project Quality Gate overview',
    status: 'ALL HEALTHY',
    tone: 'healthy',
    route: 'sonar',
  },
  {
    eyebrow: 'DEPLOY',
    value: '04',
    title: 'Render',
    description: 'Services, environments and deployment status',
    status: 'VIEW',
    tone: 'healthy',
    route: 'render',
  },
  {
    eyebrow: 'IDENTITY',
    value: '—',
    title: 'Central Users',
    description: 'Future permanent ORBIS identity registry',
    status: 'NEXT PHASE',
    tone: 'info',
    route: 'users',
  },
  {
    eyebrow: 'MODULES',
    value: '03',
    title: 'Modules / Models',
    description: 'Cross-project module and model inventory',
    status: 'VIEW',
    tone: 'info',
    route: 'projects',
  },
  {
    eyebrow: 'REVIEW',
    value: '01',
    title: 'Review / Publish',
    description: 'Owner approval and future publish queue',
    status: '1 PENDING',
    tone: 'warning',
    route: 'review',
  },
  {
    eyebrow: 'ALERTS',
    value: '00',
    title: 'Alerts',
    description: 'Issues requiring owner attention',
    status: 'CLEAR',
    tone: 'healthy',
    route: 'alerts',
  },
  {
    eyebrow: 'RUNTIME',
    value: '91%',
    title: 'Service Health',
    description: 'Cross-project runtime and API health',
    status: 'STABLE',
    tone: 'healthy',
    route: 'health',
  },
  {
    eyebrow: 'AUDIT',
    value: '08',
    title: 'Activity',
    description: 'Recent administrative activity',
    status: 'VIEW',
    tone: 'info',
    route: 'activity',
  },
  {
    eyebrow: 'ENV',
    value: '02',
    title: 'Environments',
    description: 'Preview, staging and production overview',
    status: 'VIEW',
    tone: 'info',
    route: 'render',
  },
  {
    eyebrow: 'SETUP',
    value: '12',
    title: 'Settings',
    description: 'Registry, integrations and configuration',
    status: 'OPEN',
    tone: 'info',
    route: 'settings',
  },
]

const foundationCards: CardData[] = [
  {
    eyebrow: 'RUNTIME',
    value: 'LIVE',
    title: 'Runtime',
    description: 'API and service health',
    status: 'HEALTHY',
    tone: 'healthy',
    route: 'foundation-runtime',
  },
  {
    eyebrow: 'CI',
    value: 'GREEN',
    title: 'GitHub Actions',
    description: 'Required checks and workflows',
    status: 'PASS',
    tone: 'healthy',
    route: 'foundation-actions',
  },
  {
    eyebrow: 'QUALITY',
    value: 'PASS',
    title: 'Sonar Quality',
    description: 'Quality Gate and issue summary',
    status: 'PASS',
    tone: 'healthy',
    route: 'foundation-sonar',
  },
  {
    eyebrow: 'DEPLOY',
    value: 'LIVE',
    title: 'Render',
    description: 'Deployments and environments',
    status: 'LIVE',
    tone: 'healthy',
    route: 'foundation-render',
  },
  {
    eyebrow: 'MODULES',
    value: '03',
    title: 'Modules / Models',
    description: 'Accounting, Admin and AI',
    status: 'VIEW',
    tone: 'info',
    route: 'foundation-modules',
  },
  {
    eyebrow: 'USERS',
    value: '—',
    title: 'Users',
    description: 'Future membership summary',
    status: 'VIEW',
    tone: 'info',
    route: 'foundation-users',
  },
  {
    eyebrow: 'RELEASE',
    value: 'v1',
    title: 'Versions',
    description: 'Current and published state',
    status: 'VIEW',
    tone: 'info',
    route: 'foundation-versions',
  },
  {
    eyebrow: 'HEALTH',
    value: '91%',
    title: 'Health & Quality',
    description: 'Combined project summary',
    status: 'STABLE',
    tone: 'healthy',
    route: 'foundation-quality',
  },
]

const projects: ProjectData[] = [
  {
    name: 'ORBIS Foundation',
    kind: 'Existing Product',
    status: 'LIVE',
    tone: 'healthy',
    actionStatus: 'ACTIONS GREEN',
    route: 'foundation',
  },
  {
    name: 'ORBIS Game',
    kind: 'Future Product',
    status: 'PLANNED',
    tone: 'info',
    actionStatus: 'NOT CONNECTED',
  },
  {
    name: 'Future ORBIS Project',
    kind: 'Registry Slot',
    status: 'NOT CONNECTED',
    tone: 'muted',
    actionStatus: 'NOT CONNECTED',
  },
]

const menuItems: Array<{ label: string; route: Route }> = [
  { label: 'Command Center', route: 'home' },
  { label: 'Projects', route: 'projects' },
  { label: 'GitHub Actions', route: 'actions' },
  { label: 'Sonar Quality', route: 'sonar' },
  { label: 'Central Users', route: 'users' },
  { label: 'Settings', route: 'settings' },
]

const routeLabels: Record<Route, string> = {
  home: 'Command Center',
  projects: 'Projects',
  foundation: 'Projects / ORBIS Foundation',
  actions: 'GitHub Actions',
  sonar: 'Sonar Quality',
  render: 'Render / Environments',
  users: 'Central Users',
  settings: 'Settings / Integrations',
  activity: 'Activity / Audit',
  review: 'Review / Publish',
  alerts: 'Alerts / Incidents',
  health: 'Service Health',
  'foundation-actions': 'ORBIS Foundation / GitHub Actions',
  'foundation-sonar': 'ORBIS Foundation / Sonar Quality',
  'foundation-render': 'ORBIS Foundation / Render',
  'foundation-runtime': 'ORBIS Foundation / Runtime',
  'foundation-modules': 'ORBIS Foundation / Modules',
  'foundation-users': 'ORBIS Foundation / Users',
  'foundation-versions': 'ORBIS Foundation / Versions',
  'foundation-quality': 'ORBIS Foundation / Health',
}

function StatusPill({ tone, text }: { tone: Tone; text: string }) {
  return (
    <span className={`status-pill status-${tone}`}>
      <span className="status-dot" aria-hidden="true" />
      {text}
    </span>
  )
}

function DashboardCard({
  card,
  onOpen,
}: {
  card: CardData
  onOpen: (route: Route) => void
}) {
  return (
    <button
      type="button"
      className={`dashboard-card ${
        card.variant === 'primary' ? 'dashboard-card-primary' : ''
      }`}
      onClick={() => onOpen(card.route)}
    >
      <span className="card-arrow" aria-hidden="true">
        ↗
      </span>
      <span className="card-eyebrow">{card.eyebrow}</span>
      <strong className="card-value">{card.value}</strong>
      <span className="card-title">{card.title}</span>
      <span className="card-description">{card.description}</span>
      <StatusPill tone={card.tone} text={card.status} />
    </button>
  )
}

function PageHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="page-heading">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  )
}

function DetailPanel({
  title,
  rows,
  onCopy,
}: {
  title: string
  rows: Array<[string, string]>
  onCopy: (value: string) => void
}) {
  return (
    <section className="detail-panel">
      <h2>{title}</h2>
      <div className="detail-list">
        {rows.map(([label, value]) => (
          <div className="detail-row" key={label}>
            <span className="detail-label">{label}</span>
            <strong>{value}</strong>
            <button
              type="button"
              className="copy-button"
              onClick={() => onCopy(value)}
            >
              Copy
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function App() {
  const initialRoute = (() => {
    const hash = window.location.hash.replace('#', '')
    return hash && hash in routeLabels ? (hash as Route) : 'home'
  })()

  const [route, setRoute] = useState<Route>(initialRoute)
  const [routeStack, setRouteStack] = useState<Route[]>([initialRoute])
  const [menuOpen, setMenuOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '')
      const nextRoute =
        hash && hash in routeLabels ? (hash as Route) : 'home'

      setRoute(nextRoute)
      setRouteStack((current) => {
        const existingIndex = current.lastIndexOf(nextRoute)
        return existingIndex >= 0
          ? current.slice(0, existingIndex + 1)
          : [nextRoute]
      })
      setMenuOpen(false)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const go = (nextRoute: Route) => {
    if (nextRoute === route) {
      setMenuOpen(false)
      return
    }

    window.history.pushState({}, '', `#${nextRoute}`)
    setRoute(nextRoute)
    setRouteStack((current) => [...current, nextRoute])
    setMenuOpen(false)
  }

  const goBack = () => {
    if (routeStack.length > 1) {
      window.history.back()
      return
    }

    go('home')
  }

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setToast('Copied')
    } catch {
      setToast('Copy unavailable')
    }

    window.setTimeout(() => setToast(null), 1200)
  }

  const renderHome = () => (
    <>
      <PageHeading
        title="Command Center"
        description="Your ORBIS projects, quality, deployment and control areas in one compact owner dashboard."
      />
      <div className="dashboard-grid">
        {homeCards.map((card) => (
          <DashboardCard key={card.title} card={card} onOpen={go} />
        ))}
      </div>
    </>
  )

  const renderProjects = () => (
    <>
      <PageHeading
        title="Projects"
        description="Choose a registered ORBIS project to open its unified Admin control view."
      />
      <div className="project-grid">
        {projects.map((project) => (
          <button
            type="button"
            className="project-card"
            key={project.name}
            onClick={
              project.route ? () => go(project.route!) : undefined
            }
            disabled={!project.route}
          >
            <span className="project-type">{project.kind}</span>
            <strong>{project.name}</strong>
            <div className="project-status-row">
              <StatusPill tone={project.tone} text={project.status} />
              <span className="project-action-status">
                {project.actionStatus}
              </span>
            </div>
          </button>
        ))}
      </div>
    </>
  )

  const renderFoundation = () => (
    <>
      <PageHeading
        title="ORBIS Foundation"
        description="Project-level command board. Open an exact admin area only when you need its detail."
      />
      <div className="project-summary">
        <div>
          <span>PROJECT CONTROL</span>
          <strong>ORBIS Foundation</strong>
        </div>
        <StatusPill tone="healthy" text="LIVE / DEMO VIEW" />
      </div>
      <div className="dashboard-grid project-dashboard-grid">
        {foundationCards.map((card) => (
          <DashboardCard key={card.title} card={card} onOpen={go} />
        ))}
      </div>
    </>
  )

  const renderActions = () => (
    <>
      <PageHeading
        title="GitHub Actions"
        description="Overall CI status first. Open a project only when its workflow requires attention."
      />
      <section className="list-panel">
        <h2>Registered Projects</h2>
        <button
          type="button"
          className="list-row"
          onClick={() => go('foundation-actions')}
        >
          <span>
            <strong>ORBIS Foundation</strong>
            <small>Required GitHub workflow checks</small>
          </span>
          <StatusPill tone="healthy" text="ALL GREEN" />
          <span aria-hidden="true">›</span>
        </button>
        <div className="list-row list-row-disabled">
          <span>
            <strong>ORBIS Game</strong>
            <small>Future registry connection</small>
          </span>
          <StatusPill tone="muted" text="NOT CONNECTED" />
          <span aria-hidden="true">›</span>
        </div>
      </section>
    </>
  )

  const renderSonar = () => (
    <>
      <PageHeading
        title="Sonar Quality"
        description="Cross-project Quality Gate overview for registered Sonar projects."
      />
      <section className="list-panel">
        <h2>Sonar Projects</h2>
        <button
          type="button"
          className="list-row"
          onClick={() => go('foundation-sonar')}
        >
          <span>
            <strong>ORBIS Foundation</strong>
            <small>orbisaideveloper_orbis-foundation</small>
          </span>
          <StatusPill tone="healthy" text="QUALITY GATE PASS" />
          <span aria-hidden="true">›</span>
        </button>
        <div className="list-row list-row-disabled">
          <span>
            <strong>ORBIS Game</strong>
            <small>No Sonar mapping yet</small>
          </span>
          <StatusPill tone="muted" text="NOT CONNECTED" />
          <span aria-hidden="true">›</span>
        </div>
      </section>
    </>
  )

  const renderRender = () => (
    <>
      <PageHeading
        title="Render / Environments"
        description="Read-only deployment overview. ORBIS Admin will receive its own independent Render service later."
      />
      <section className="list-panel">
        <h2>Current Registry View</h2>
        <button
          type="button"
          className="list-row"
          onClick={() => go('foundation-render')}
        >
          <span>
            <strong>ORBIS Foundation</strong>
            <small>Production and staging services</small>
          </span>
          <StatusPill tone="healthy" text="LIVE" />
          <span aria-hidden="true">›</span>
        </button>
        <div className="list-row list-row-disabled">
          <span>
            <strong>ORBIS Admin</strong>
            <small>Dedicated service will be created in Step 5</small>
          </span>
          <StatusPill tone="info" text="PENDING" />
          <span aria-hidden="true">›</span>
        </div>
      </section>
    </>
  )

  const renderDetail = (
    title: string,
    description: string,
    rows: Array<[string, string]>,
    provider?: { label: string; href: string },
  ) => (
    <>
      <PageHeading title={title} description={description} />
      <div className="detail-grid">
        <DetailPanel title="Summary" rows={rows} onCopy={copyValue} />
        <section className="detail-panel provider-panel">
          <h2>Provider Access</h2>
          <p>
            This scaffold is read-only/demo. Live provider data will be wired
            later through secure server-side integrations.
          </p>
          {provider && (
            <a
              className="provider-link"
              href={provider.href}
              target="_blank"
              rel="noreferrer"
            >
              {provider.label} ↗
            </a>
          )}
        </section>
      </div>
    </>
  )

  const renderRoute = () => {
    switch (route) {
      case 'home':
        return renderHome()
      case 'projects':
        return renderProjects()
      case 'foundation':
        return renderFoundation()
      case 'actions':
        return renderActions()
      case 'sonar':
        return renderSonar()
      case 'render':
        return renderRender()
      case 'users':
        return renderDetail(
          'Central Users',
          'Future central ORBIS identity registry. No real customer data is stored in this scaffold.',
          [
            ['Admin Database', 'Dedicated ORBIS Admin database'],
            ['Permanent Identity', 'One immutable ORBIS ID per person'],
            ['Product Data', 'Remains in each product database'],
          ],
        )
      case 'settings':
        return renderDetail(
          'Settings / Integrations',
          'Registry and provider configuration shell.',
          [
            ['Admin Database', 'Dedicated / independent'],
            ['Admin Render', 'Dedicated service in Step 5'],
            ['Project Registry', 'Dynamic'],
            ['Secrets', 'Server-side only'],
          ],
        )
      case 'activity':
        return renderDetail(
          'Activity / Audit',
          'Read-only demonstration of the future audit surface.',
          [
            ['Step 3', 'Architecture merged'],
            ['Step 4', 'Application scaffold in progress'],
            ['Mode', 'Read-only demo shell'],
          ],
        )
      case 'review':
        return renderDetail(
          'Review / Publish',
          'Future owner approval queue. Dangerous controls remain unavailable.',
          [
            ['Pending', '1 demo item'],
            ['Publish Controls', 'Not enabled'],
            ['Audit Requirement', 'Required before write actions'],
          ],
        )
      case 'alerts':
        return renderDetail(
          'Alerts / Incidents',
          'Cross-project issues requiring attention.',
          [
            ['Critical', '0'],
            ['Warnings', '0'],
            ['Overall', 'Clear'],
          ],
        )
      case 'health':
        return renderDetail(
          'Service Health',
          'Cross-project runtime summary.',
          [
            ['ORBIS Foundation', 'Healthy'],
            ['ORBIS Admin', 'Scaffold in progress'],
            ['Future Projects', 'Not connected'],
          ],
        )
      case 'foundation-actions':
        return renderDetail(
          'Foundation · GitHub Actions',
          'Exact workflow summary for ORBIS Foundation.',
          [
            ['Repository', 'orbisaideveloper/orbis-foundation'],
            ['Branch', 'main'],
            ['Required Check', 'Build, Test & Safety Audit'],
            ['Status', 'GREEN / DEMO'],
          ],
          { label: 'Open in GitHub', href: 'https://github.com/' },
        )
      case 'foundation-sonar':
        return renderDetail(
          'Foundation · Sonar Quality',
          'Exact project-level quality summary.',
          [
            ['Quality Gate', 'PASS / DEMO'],
            ['Project Key', 'orbisaideveloper_orbis-foundation'],
            ['New Issues', '0 / DEMO'],
            ['Coverage', 'Provider metric later'],
          ],
          { label: 'Open in SonarQube Cloud', href: 'https://sonarcloud.io/' },
        )
      case 'foundation-render':
        return renderDetail(
          'Foundation · Render',
          'Read-only deployment and environment summary.',
          [
            ['Production', 'LIVE'],
            ['Staging', 'LIVE'],
            ['Production Service', 'orbis-foundation'],
            ['Staging Service', 'orbis-foundation-staging'],
          ],
          { label: 'Open in Render', href: 'https://dashboard.render.com/' },
        )
      case 'foundation-runtime':
        return renderDetail(
          'Foundation · Runtime',
          'Runtime health summary.',
          [
            ['Overall', 'Healthy / Demo'],
            ['API Health', 'Available'],
            ['Mode', 'Read-only'],
          ],
        )
      case 'foundation-modules':
        return renderDetail(
          'Foundation · Modules / Models',
          'Main Foundation module inventory.',
          [
            ['Accounting', 'Active'],
            ['Admin', 'Existing'],
            ['AI', 'Planned integration'],
          ],
        )
      case 'foundation-users':
        return renderDetail(
          'Foundation · Users',
          'Future product membership summary.',
          [
            ['Central ORBIS ID', 'Referenced later'],
            ['Product Profiles', 'Foundation database'],
            ['Admin Identity', 'Dedicated Admin database later'],
          ],
        )
      case 'foundation-versions':
        return renderDetail(
          'Foundation · Versions',
          'Current and published state pattern.',
          [
            ['Current', 'v1 / Demo'],
            ['Published', 'v1 / Demo'],
            ['Review', 'No pending release'],
          ],
        )
      case 'foundation-quality':
        return renderDetail(
          'Foundation · Health & Quality',
          'Combined project quality summary.',
          [
            ['GitHub Actions', 'GREEN / DEMO'],
            ['Sonar', 'PASS / DEMO'],
            ['Render', 'LIVE'],
            ['Runtime', 'HEALTHY / DEMO'],
          ],
        )
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          type="button"
          className="brand-button"
          onClick={() => go('home')}
          aria-label="Go to ORBIS Command Center"
        >
          <span className="brand-orb" aria-hidden="true" />
          <span>
            <strong>ORBIS</strong>
            <small>Admin Control Plane</small>
          </span>
        </button>

        <div className="topbar-actions">
          <div className="live-clock">
            <strong>
              {now.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </strong>
            <span>
              {now.toLocaleDateString([], {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          <div className="menu-wrap">
            <button
              type="button"
              className="menu-button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
            >
              ⋮
            </button>

            {menuOpen && (
              <div className="menu-panel">
                {menuItems.map((item) => (
                  <button
                    type="button"
                    key={item.route}
                    onClick={() => go(item.route)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main-shell">
        {route !== 'home' && (
          <nav className="route-nav" aria-label="Page navigation">
            <div>
              <button type="button" onClick={goBack}>
                ← Back
              </button>
              <button type="button" onClick={() => go('home')}>
                ⌂ Home
              </button>
            </div>
            <span>{routeLabels[route]}</span>
          </nav>
        )}

        {renderRoute()}
      </main>

      <footer className="preview-footer">
        ORBIS Admin V1 scaffold · Read-only/demo data · No production controls
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default App
