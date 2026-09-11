import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  BrowserRouter,
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import type {
  ProjectRegistryProject,
  ProjectRegistryResponse,
} from '@orbis-admin/contracts'
import {
  loadProjectRegistry,
  type RegistryLoader,
} from './api/project-registry'
import {
  aggregateTone,
  commandAreas,
  findCommandArea,
  findProject,
  githubRepositoryUrl,
  modulesLabel,
  releaseLabel,
  repositoryLabel,
  toneLabel,
  usersLabel,
  type CommandArea,
  type StatusTone,
} from './model'
import './styles.css'

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

export const formatDateTime = (date: Date) => ({
  date: dateFormatter.format(date),
  time: timeFormatter.format(date),
})

type RegistryState =
  | { status: 'loading' }
  | { status: 'ready'; data: ProjectRegistryResponse }
  | { status: 'error'; message: string }

export const registryErrorMessage = (reason: unknown) =>
  reason instanceof Error ? reason.message : 'Unable to load project registry'

export const useProjectRegistry = (
  loader: RegistryLoader = loadProjectRegistry,
): RegistryState => {
  const [state, setState] = useState<RegistryState>({
    status: 'loading',
  })

  useEffect(() => {
    void loader().then(
      (data) => setState({ status: 'ready', data }),
      (reason: unknown) => {
        setState({
          status: 'error',
          message: registryErrorMessage(reason),
        })
      },
    )
  }, [loader])

  return state
}

const StatusDot = ({ tone }: { tone: StatusTone }) => (
  <span
    className={`status-dot status-dot--${tone}`}
    aria-label={toneLabel(tone)}
  />
)

const AppHeader = () => {
  const [now, setNow] = useState(() => new Date())
  const [menuOpen, setMenuOpen] = useState(false)
  const formatted = formatDateTime(now)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <header className="topbar">
      <Link className="brand" to="/" aria-label="ORBIS Admin home">
        <span className="brand-mark">O</span>
        <span>
          <strong>ORBIS</strong>
          <small>ADMIN CONTROL PLANE</small>
        </span>
      </Link>
      <div className="topbar-actions">
        <div className="clock" aria-label="Current admin date and time">
          <strong>{formatted.time}</strong>
          <small>{formatted.date}</small>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Open admin menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          ⋮
        </button>
        {menuOpen ? (
          <div className="menu" role="menu">
            <span role="menuitem">Owner view</span>
            <span role="menuitem">Read-only V1</span>
            <span role="menuitem">No secrets rendered</span>
          </div>
        ) : null}
      </div>
    </header>
  )
}

const Shell = ({ children }: { children: ReactNode }) => (
  <div className="app-shell">
    <div className="ambient ambient--one" />
    <div className="ambient ambient--two" />
    <AppHeader />
    <main className="page">{children}</main>
  </div>
)

const PageNavigation = ({
  title,
  eyebrow,
}: {
  title: string
  eyebrow: string
}) => {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="page-nav">
      <div className="page-nav-buttons">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back one screen"
        >
          ← Back
        </button>
        <Link to="/">⌂ Home</Link>
      </div>
      <div className="breadcrumb" aria-label="Current location">
        <span>{eyebrow}</span>
        <strong>{title}</strong>
        <small>{location.pathname}</small>
      </div>
    </div>
  )
}

const CommandCard = ({ area }: { area: CommandArea }) => (
  <Link
    className={`command-card command-card--${area.tone}`}
    to={`/category/${area.id}`}
  >
    <div className="command-card-topline">
      <span>{area.eyebrow}</span>
      <StatusDot tone={area.tone} />
    </div>
    <strong>{area.title}</strong>
    <p>{area.summary}</p>
    <div className="command-card-footer">
      <span>{area.metric}</span>
      <span aria-hidden="true">↗</span>
    </div>
  </Link>
)

const HomePage = ({
  projects,
}: {
  projects: readonly ProjectRegistryProject[]
}) => {
  const projectTone = useMemo(
    () => aggregateTone(projects.map((project) => project.signals.health)),
    [projects],
  )

  return (
    <Shell>
      <section className="hero">
        <div>
          <span className="kicker">OWNER COMMAND CENTER</span>
          <h1>ORBIS Admin</h1>
          <p>
            One control plane for every ORBIS project, quality signal and future
            identity.
          </p>
        </div>
        <div className="hero-status">
          <StatusDot tone={projectTone} />
          <span>Control plane foundation active</span>
        </div>
      </section>

      <section className="primary-projects" aria-label="Primary projects entry">
        <Link to="/projects" className="projects-primary-card">
          <div>
            <span className="kicker">PRIMARY ENTRY</span>
            <h2>Projects</h2>
            <p>
              Open the registry, then drill into a project and its exact admin
              area.
            </p>
          </div>
          <div className="projects-primary-metrics">
            <strong>{projects.length}</strong>
            <span>tracked projects</span>
          </div>
        </Link>
      </section>

      <section className="command-grid" aria-label="ORBIS Admin command areas">
        {commandAreas
          .filter((area) => area.id !== 'projects')
          .map((area) => (
            <CommandCard key={area.id} area={area} />
          ))}
      </section>
    </Shell>
  )
}

const ProjectCard = ({
  project,
}: {
  project: ProjectRegistryProject
}) => (
  <Link className="project-card" to={`/projects/${project.id}`}>
    <div className="project-card-heading">
      <div>
        <span className="kicker">{project.kind}</span>
        <h2>{project.name}</h2>
      </div>
      <StatusDot tone={project.signals.health} />
    </div>
    <dl>
      <div>
        <dt>Repository</dt>
        <dd>{repositoryLabel(project)}</dd>
      </div>
      <div>
        <dt>Environment</dt>
        <dd>{project.environment.label}</dd>
      </div>
      <div>
        <dt>Quality</dt>
        <dd>{toneLabel(project.signals.quality)}</dd>
      </div>
    </dl>
    <span className="card-link">Open project admin →</span>
  </Link>
)

const ProjectsPage = ({
  projects,
}: {
  projects: readonly ProjectRegistryProject[]
}) => (
  <Shell>
    <PageNavigation title="Projects" eyebrow="Registry" />
    <section className="section-heading">
      <span className="kicker">REGISTRY-DRIVEN VIEW</span>
      <h1>Projects</h1>
      <p>Connected, external and future ORBIS products in one owner-only list.</p>
    </section>
    <section className="project-grid">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </section>
  </Shell>
)

const projectAreas = [
  'modules',
  'github',
  'sonar',
  'render',
  'environments',
  'users',
  'health',
  'activity',
]

const ProjectPage = ({
  projects,
}: {
  projects: readonly ProjectRegistryProject[]
}) => {
  const { projectId } = useParams<{ projectId: string }>()
  const project = findProject(projects, projectId!)

  if (!project) return <NotFoundPage />

  const repositoryUrl = githubRepositoryUrl(project)

  return (
    <Shell>
      <PageNavigation title={project.name} eyebrow="Project Admin" />
      <section className="project-hero">
        <div>
          <span className="kicker">{project.kind}</span>
          <h1>{project.name}</h1>
          <p>{repositoryLabel(project)}</p>
        </div>
        <div className="project-health-panel">
          <StatusDot tone={project.signals.health} />
          <strong>{toneLabel(project.signals.health)}</strong>
          <span>{project.environment.label}</span>
        </div>
      </section>

      <section className="summary-grid">
        <SummaryTile
          label="Current"
          value={releaseLabel(project.release.current)}
        />
        <SummaryTile
          label="Published"
          value={releaseLabel(project.release.published)}
        />
        <SummaryTile label="Modules" value={modulesLabel(project.modules)} />
        <SummaryTile label="Users" value={usersLabel(project)} />
      </section>

      <section className="command-grid command-grid--project">
        {projectAreas.map((areaId) => {
          const area = findCommandArea(areaId)!
          return (
            <Link
              className="command-card"
              key={area.id}
              to={`/detail/${area.id}/${project.id}`}
            >
              <div className="command-card-topline">
                <span>{area.eyebrow}</span>
                <StatusDot tone={area.tone} />
              </div>
              <strong>{area.title}</strong>
              <p>{area.summary}</p>
              <div className="command-card-footer">
                <span>Project detail</span>
                <span aria-hidden="true">→</span>
              </div>
            </Link>
          )
        })}
      </section>

      {repositoryUrl ? (
        <a
          className="provider-link"
          href={repositoryUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in GitHub ↗
        </a>
      ) : null}
    </Shell>
  )
}

const SummaryTile = ({
  label,
  value,
}: {
  label: string
  value: string
}) => (
  <div className="summary-tile">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
)

const CategoryPage = ({
  projects,
}: {
  projects: readonly ProjectRegistryProject[]
}) => {
  const { categoryId } = useParams<{ categoryId: string }>()
  const area = findCommandArea(categoryId!)

  if (!area) return <NotFoundPage />

  return (
    <Shell>
      <PageNavigation title={area.title} eyebrow={area.eyebrow} />
      <section className="section-heading">
        <span className="kicker">CROSS-PROJECT SIGNAL</span>
        <h1>{area.title}</h1>
        <p>{area.summary}</p>
      </section>

      <section className="project-grid">
        {projects.map((project) => (
          <Link
            className="project-card"
            key={project.id}
            to={`/detail/${area.id}/${project.id}`}
          >
            <div className="project-card-heading">
              <div>
                <span className="kicker">{project.kind}</span>
                <h2>{project.name}</h2>
              </div>
              <StatusDot tone={project.signals.quality} />
            </div>
            <p>{repositoryLabel(project)}</p>
            <span className="card-link">
              Open {area.title} detail →
            </span>
          </Link>
        ))}
      </section>
    </Shell>
  )
}

export const copyText = async (value: string) =>
  navigator.clipboard.writeText(value)

const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await copyText(value)
    setCopied(true)
  }

  return (
    <button className="copy-button" type="button" onClick={handleCopy}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

const DetailPage = ({
  projects,
}: {
  projects: readonly ProjectRegistryProject[]
}) => {
  const { categoryId, projectId } = useParams<{
    categoryId: string
    projectId: string
  }>()
  const area = findCommandArea(categoryId!)
  const project = findProject(projects, projectId!)

  if (!area || !project) return <NotFoundPage />

  const diagnostic =
    `${project.name} — ${area.title}; ` +
    `repository=${repositoryLabel(project)}; ` +
    `environment=${project.environment.label}; ` +
    `quality=${toneLabel(project.signals.quality)}`

  return (
    <Shell>
      <PageNavigation
        title={`${project.name} / ${area.title}`}
        eyebrow="Detail"
      />
      <section className="detail-panel">
        <div className="detail-title-row">
          <div>
            <span className="kicker">{area.eyebrow}</span>
            <h1>{area.title}</h1>
            <p>{project.name}</p>
          </div>
          <StatusDot tone={project.signals.quality} />
        </div>

        <div className="detail-list">
          <DetailValue
            label="Repository"
            value={repositoryLabel(project)}
            copyable
          />
          <DetailValue
            label="Environment"
            value={project.environment.label}
          />
          <DetailValue
            label="Current version"
            value={releaseLabel(project.release.current)}
          />
          <DetailValue
            label="Quality"
            value={toneLabel(project.signals.quality)}
          />
          <DetailValue
            label="AI-ready diagnostic brief"
            value={diagnostic}
            copyable
          />
        </div>

        <div className="notice">
          <strong>V1 safety boundary</strong>
          <span>
            Read-only normalized registry data. No deploy, publish, rollback,
            customer write or secret action is connected.
          </span>
        </div>
      </section>
    </Shell>
  )
}

const DetailValue = ({
  label,
  value,
  copyable = false,
}: {
  label: string
  value: string
  copyable?: boolean
}) => (
  <div className="detail-value">
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
    {copyable ? <CopyButton value={value} /> : null}
  </div>
)

const RegistryLoadingPage = () => (
  <Shell>
    <section className="empty-state">
      <span className="kicker">REGISTRY</span>
      <h1>Loading project registry</h1>
      <p>Reading the canonical ORBIS Admin project model.</p>
    </section>
  </Shell>
)

const RegistryErrorPage = ({ message }: { message: string }) => (
  <Shell>
    <section className="empty-state">
      <span className="kicker">REGISTRY ERROR</span>
      <h1>Project registry unavailable</h1>
      <p>{message}</p>
    </section>
  </Shell>
)

const NotFoundPage = () => (
  <Shell>
    <PageNavigation title="Not Found" eyebrow="Navigation" />
    <section className="empty-state">
      <span className="kicker">404</span>
      <h1>Admin view not found</h1>
      <p>The requested route or registry record is not available.</p>
      <Link to="/">Return Home</Link>
    </section>
  </Shell>
)

const AdminRoutes = ({
  registryLoader,
}: {
  registryLoader?: RegistryLoader
}) => {
  const registry = useProjectRegistry(registryLoader)

  if (registry.status === 'loading') {
    return <RegistryLoadingPage />
  }

  if (registry.status === 'error') {
    return <RegistryErrorPage message={registry.message} />
  }

  const projects = registry.data.projects

  return (
    <Routes>
      <Route path="/" element={<HomePage projects={projects} />} />
      <Route
        path="/projects"
        element={<ProjectsPage projects={projects} />}
      />
      <Route
        path="/projects/:projectId"
        element={<ProjectPage projects={projects} />}
      />
      <Route
        path="/category/:categoryId"
        element={<CategoryPage projects={projects} />}
      />
      <Route
        path="/detail/:categoryId/:projectId"
        element={<DetailPage projects={projects} />}
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export const TestRouter = ({
  initialEntries,
  registryLoader,
}: {
  initialEntries: string[]
  registryLoader?: RegistryLoader
}) => (
  <MemoryRouter initialEntries={initialEntries}>
    <AdminRoutes registryLoader={registryLoader} />
  </MemoryRouter>
)

export default function App() {
  return (
    <BrowserRouter>
      <AdminRoutes />
    </BrowserRouter>
  )
}
