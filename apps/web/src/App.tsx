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
import {
  aggregateTone,
  commandAreas,
  findCommandArea,
  findProject,
  projects,
  toneLabel,
  type CommandArea,
  type ProjectSummary,
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

const StatusDot = ({ tone }: { tone: StatusTone }) => (
  <span className={`status-dot status-dot--${tone}`} aria-label={toneLabel(tone)} />
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

const PageNavigation = ({ title, eyebrow }: { title: string; eyebrow: string }) => {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="page-nav">
      <div className="page-nav-buttons">
        <button type="button" onClick={() => navigate(-1)} aria-label="Go back one screen">
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
    <Link className={`command-card command-card--${area.tone}`} to={`/category/${area.id}`}>
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

const HomePage = () => {
  const projectTone = useMemo(() => aggregateTone(projects.map((project) => project.health)), [])

  return (
    <Shell>
      <section className="hero">
        <div>
          <span className="kicker">OWNER COMMAND CENTER</span>
          <h1>ORBIS Admin</h1>
          <p>One control plane for every ORBIS project, quality signal and future identity.</p>
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
            <p>Open the registry, then drill into a project and its exact admin area.</p>
          </div>
          <div className="projects-primary-metrics">
            <strong>{projects.length}</strong>
            <span>tracked projects</span>
          </div>
        </Link>
      </section>

      <section className="command-grid" aria-label="ORBIS Admin command areas">
        {commandAreas.filter((area) => area.id !== 'projects').map((area) => (
          <CommandCard key={area.id} area={area} />
        ))}
      </section>
    </Shell>
  )
}

const ProjectCard = ({ project }: { project: ProjectSummary }) => (
  <Link className="project-card" to={`/projects/${project.id}`}>
    <div className="project-card-heading">
      <div>
        <span className="kicker">{project.kind}</span>
        <h2>{project.name}</h2>
      </div>
      <StatusDot tone={project.health} />
    </div>
    <dl>
      <div>
        <dt>Repository</dt>
        <dd>{project.repository}</dd>
      </div>
      <div>
        <dt>Environment</dt>
        <dd>{project.environment}</dd>
      </div>
      <div>
        <dt>Quality</dt>
        <dd>{toneLabel(project.quality)}</dd>
      </div>
    </dl>
    <span className="card-link">Open project admin →</span>
  </Link>
)

const ProjectsPage = () => (
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

const projectAreas = ['modules', 'github', 'sonar', 'render', 'environments', 'users', 'health', 'activity']

const ProjectPage = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const project = findProject(projectId!)

  if (!project) return <NotFoundPage />

  return (
    <Shell>
      <PageNavigation title={project.name} eyebrow="Project Admin" />
      <section className="project-hero">
        <div>
          <span className="kicker">{project.kind}</span>
          <h1>{project.name}</h1>
          <p>{project.repository}</p>
        </div>
        <div className="project-health-panel">
          <StatusDot tone={project.health} />
          <strong>{toneLabel(project.health)}</strong>
          <span>{project.environment}</span>
        </div>
      </section>

      <section className="summary-grid">
        <SummaryTile label="Current" value={project.version} />
        <SummaryTile label="Published" value={project.publishedVersion} />
        <SummaryTile label="Modules" value={String(project.modules)} />
        <SummaryTile label="Users" value={project.users} />
      </section>

      <section className="command-grid command-grid--project">
        {projectAreas.map((areaId) => {
          const area = findCommandArea(areaId)!
          return (
            <Link className="command-card" key={area.id} to={`/detail/${area.id}/${project.id}`}>
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

      {project.githubUrl ? (
        <a className="provider-link" href={project.githubUrl} target="_blank" rel="noopener noreferrer">
          Open in GitHub ↗
        </a>
      ) : null}
    </Shell>
  )
}

const SummaryTile = ({ label, value }: { label: string; value: string }) => (
  <div className="summary-tile">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
)

const CategoryPage = () => {
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
          <Link className="project-card" key={project.id} to={`/detail/${area.id}/${project.id}`}>
            <div className="project-card-heading">
              <div>
                <span className="kicker">{project.kind}</span>
                <h2>{project.name}</h2>
              </div>
              <StatusDot tone={project.quality} />
            </div>
            <p>{project.repository}</p>
            <span className="card-link">Open {area.title} detail →</span>
          </Link>
        ))}
      </section>
    </Shell>
  )
}

export const copyText = async (value: string) => navigator.clipboard.writeText(value)

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

const DetailPage = () => {
  const { categoryId, projectId } = useParams<{ categoryId: string; projectId: string }>()
  const area = findCommandArea(categoryId!)
  const project = findProject(projectId!)

  if (!area || !project) return <NotFoundPage />

  const diagnostic = `${project.name} — ${area.title}; repository=${project.repository}; environment=${project.environment}; quality=${toneLabel(project.quality)}`

  return (
    <Shell>
      <PageNavigation title={`${project.name} / ${area.title}`} eyebrow="Detail" />
      <section className="detail-panel">
        <div className="detail-title-row">
          <div>
            <span className="kicker">{area.eyebrow}</span>
            <h1>{area.title}</h1>
            <p>{project.name}</p>
          </div>
          <StatusDot tone={project.quality} />
        </div>

        <div className="detail-list">
          <DetailValue label="Repository" value={project.repository} copyable />
          <DetailValue label="Environment" value={project.environment} />
          <DetailValue label="Current version" value={project.version} />
          <DetailValue label="Quality" value={toneLabel(project.quality)} />
          <DetailValue label="AI-ready diagnostic brief" value={diagnostic} copyable />
        </div>

        <div className="notice">
          <strong>V1 safety boundary</strong>
          <span>Read-only demo structure. No deploy, publish, rollback, customer write or secret action is connected.</span>
        </div>
      </section>
    </Shell>
  )
}

const DetailValue = ({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) => (
  <div className="detail-value">
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
    {copyable ? <CopyButton value={value} /> : null}
  </div>
)

const NotFoundPage = () => (
  <Shell>
    <PageNavigation title="Not Found" eyebrow="Navigation" />
    <section className="empty-state">
      <span className="kicker">404</span>
      <h1>Admin view not found</h1>
      <p>The requested demo route is not registered.</p>
      <Link to="/">Return Home</Link>
    </section>
  </Shell>
)

const AdminRoutes = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/projects" element={<ProjectsPage />} />
    <Route path="/projects/:projectId" element={<ProjectPage />} />
    <Route path="/category/:categoryId" element={<CategoryPage />} />
    <Route path="/detail/:categoryId/:projectId" element={<DetailPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
)

export const TestRouter = ({ initialEntries }: { initialEntries: string[] }) => (
  <MemoryRouter initialEntries={initialEntries}>
    <AdminRoutes />
  </MemoryRouter>
)

export default function App() {
  return (
    <BrowserRouter>
      <AdminRoutes />
    </BrowserRouter>
  )
}
