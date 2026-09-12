import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App, {
  TestRouter,
  copyText,
  formatDateTime,
  registryErrorMessage,
} from './App'
import type { RegistryLoader } from './api/project-registry'
import { projectRegistryFixture } from './test/project-registry-fixture'

const clipboardWrite = vi.fn<(value: string) => Promise<void>>()
const fetchMock = vi.fn<typeof fetch>()

const readyLoader: RegistryLoader = async () => projectRegistryFixture

const apiResponse = (): Response => ({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue(projectRegistryFixture),
} as unknown as Response)

beforeEach(() => {
  clipboardWrite.mockResolvedValue(undefined)
  fetchMock.mockResolvedValue(apiResponse())

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: clipboardWrite },
  })

  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  clipboardWrite.mockClear()
  fetchMock.mockClear()
  vi.unstubAllGlobals()
})

describe('ORBIS Admin V1 shell backed by the registry API', () => {
  it('mounts the production BrowserRouter and reads the same-origin registry', async () => {
    window.history.replaceState({}, '', '/')
    const view = render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'ORBIS Admin' }),
    ).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/projects', {
      headers: {
        accept: 'application/json',
      },
    })

    view.unmount()
  })

  it('renders an explicit loading state before registry data arrives', () => {
    const loader: RegistryLoader = () => new Promise(() => undefined)

    render(
      <TestRouter
        initialEntries={['/']}
        registryLoader={loader}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Loading project registry' }),
    ).toBeTruthy()
  })

  it('renders typed registry errors for Error and non-Error failures', async () => {
    const errorLoader: RegistryLoader = async () => {
      throw new Error('registry offline')
    }

    const first = render(
      <TestRouter
        initialEntries={['/']}
        registryLoader={errorLoader}
      />,
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Project registry unavailable',
      }),
    ).toBeTruthy()
    expect(screen.getByText('registry offline')).toBeTruthy()
    first.unmount()

    const unknownLoader: RegistryLoader = async () => {
      throw 'offline'
    }

    render(
      <TestRouter
        initialEntries={['/']}
        registryLoader={unknownLoader}
      />,
    )

    expect(
      await screen.findByText('Unable to load project registry'),
    ).toBeTruthy()
    expect(registryErrorMessage('offline')).toBe(
      'Unable to load project registry',
    )
  })

  it('renders the compact command center and opens the menu', async () => {
    const user = userEvent.setup()
    const view = render(
      <TestRouter initialEntries={['/']} registryLoader={readyLoader} />,
    )

    expect(
      await screen.findByRole('heading', { name: 'ORBIS Admin' }),
    ).toBeTruthy()
    expect(screen.getAllByText('Projects').length).toBeGreaterThan(0)
    expect(screen.getByText('Central Users')).toBeTruthy()
    expect(screen.getByText('Sonar Quality')).toBeTruthy()

    const menuButton = screen.getByRole('button', {
      name: 'Open admin menu',
    })
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')
    await user.click(menuButton)
    expect(menuButton.getAttribute('aria-expanded')).toBe('true')
    expect(
      screen.getByRole('menuitem', { name: 'Read-only V1' }),
    ).toBeTruthy()
    await user.click(menuButton)
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')

    view.unmount()
  })

  it('shows API-backed project registry, project details and a derived GitHub link', async () => {
    const user = userEvent.setup()

    render(
      <TestRouter initialEntries={['/']} registryLoader={readyLoader} />,
    )

    await screen.findByRole('heading', { name: 'ORBIS Admin' })
    await user.click(
      screen.getByRole('link', { name: /Projects Open the registry/i }),
    )
    expect(
      screen.getByRole('heading', { name: 'Projects' }),
    ).toBeTruthy()

    await user.click(
      screen.getByRole('link', { name: /Control Plane ORBIS Admin/i }),
    )
    expect(
      screen.getByRole('heading', { name: 'ORBIS Admin' }),
    ).toBeTruthy()
    expect(screen.getAllByText('Not reported').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('link', { name: 'Open in GitHub ↗' })
        .getAttribute('href'),
    ).toBe('https://github.com/orbisaideveloper/orbis-admin')
  })

  it('opens a category and project-specific detail from normalized registry data', async () => {
    const user = userEvent.setup()

    render(
      <TestRouter
        initialEntries={['/category/sonar']}
        registryLoader={readyLoader}
      />,
    )

    expect(
      await screen.findByRole('heading', { name: 'Sonar Quality' }),
    ).toBeTruthy()

    await user.click(
      screen.getByRole('link', {
        name: /ORBIS Admin.*Open Sonar Quality detail/i,
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Sonar Quality' }),
    ).toBeTruthy()
    expect(screen.getByText(/V1 safety boundary/)).toBeTruthy()
    expect(
      screen.getByText(/repository=orbisaideveloper\/orbis-admin/),
    ).toBeTruthy()
  })

  it('copies safe registry and diagnostic values', async () => {
    const user = userEvent.setup()

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWrite },
    })

    render(
      <TestRouter
        initialEntries={['/detail/github/orbis-admin']}
        registryLoader={readyLoader}
      />,
    )

    await screen.findByRole('heading', { name: 'GitHub Actions' })

    const copyButtons = screen.getAllByRole('button', { name: 'Copy' })
    await user.click(copyButtons[0])

    expect(clipboardWrite).toHaveBeenCalledWith(
      'orbisaideveloper/orbis-admin',
    )
    expect(
      screen.getByRole('button', { name: 'Copied' }),
    ).toBeTruthy()
    expect(
      screen.getAllByRole('button', { name: /Copy|Copied/ }),
    ).toHaveLength(2)
  })

  it('supports Home and Back navigation controls', async () => {
    const user = userEvent.setup()

    render(
      <TestRouter
        initialEntries={['/', '/projects', '/projects/orbis-admin']}
        registryLoader={readyLoader}
      />,
    )

    expect(
      await screen.findByText('orbisaideveloper/orbis-admin'),
    ).toBeTruthy()

    await user.click(
      screen.getByRole('button', { name: 'Go back one screen' }),
    )
    expect(
      screen.getByRole('heading', { name: 'Projects' }),
    ).toBeTruthy()

    await user.click(
      screen.getByRole('link', { name: '⌂ Home' }),
    )
    expect(
      screen.getByRole('heading', { name: 'ORBIS Admin' }),
    ).toBeTruthy()
  })

  it('renders not-found states for unknown routes and registry records', async () => {
    const first = render(
      <TestRouter
        initialEntries={['/unknown']}
        registryLoader={readyLoader}
      />,
    )
    expect(
      await screen.findByRole('heading', {
        name: 'Admin view not found',
      }),
    ).toBeTruthy()
    first.unmount()

    const second = render(
      <TestRouter
        initialEntries={['/projects/missing']}
        registryLoader={readyLoader}
      />,
    )
    expect(
      await screen.findByRole('heading', {
        name: 'Admin view not found',
      }),
    ).toBeTruthy()
    second.unmount()

    const third = render(
      <TestRouter
        initialEntries={['/category/missing']}
        registryLoader={readyLoader}
      />,
    )
    expect(
      await screen.findByRole('heading', {
        name: 'Admin view not found',
      }),
    ).toBeTruthy()
    third.unmount()

    const fourth = render(
      <TestRouter
        initialEntries={['/detail/missing/orbis-admin']}
        registryLoader={readyLoader}
      />,
    )
    expect(
      await screen.findByRole('heading', {
        name: 'Admin view not found',
      }),
    ).toBeTruthy()
    fourth.unmount()

    render(
      <TestRouter
        initialEntries={['/detail/github/missing']}
        registryLoader={readyLoader}
      />,
    )
    expect(
      await screen.findByRole('heading', {
        name: 'Admin view not found',
      }),
    ).toBeTruthy()
  })

  it('covers registry projects without provider links and reported counts', async () => {
    const game = render(
      <TestRouter
        initialEntries={['/projects/orbis-game']}
        registryLoader={readyLoader}
      />,
    )

    expect(
      await screen.findByText('Not registered'),
    ).toBeTruthy()
    expect(
      screen.queryByRole('link', { name: 'Open in GitHub ↗' }),
    ).toBeNull()
    expect(
      screen.getByRole('link', { name: /GitHub Actions/ }),
    ).toBeTruthy()
    game.unmount()

    render(
      <TestRouter
        initialEntries={['/projects/orbis-foundation']}
        registryLoader={readyLoader}
      />,
    )

    expect(
      await screen.findByRole('heading', {
        name: 'ORBIS Foundation',
      }),
    ).toBeTruthy()
    expect(screen.getByText('42')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
  })

  it('formats visible date and time and refreshes the clock timer', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-11T10:30:00+05:30'))

    const formatted = formatDateTime(new Date())
    expect(formatted.date).toContain('2026')
    expect(formatted.time.length).toBeGreaterThan(0)

    const view = render(
      <TestRouter initialEntries={['/']} registryLoader={readyLoader} />,
    )

    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(
      screen.getByLabelText('Current admin date and time'),
    ).toBeTruthy()
    view.unmount()
  })

  it('exposes copyText as the single safe clipboard primitive', async () => {
    await copyText('safe-value')
    expect(clipboardWrite).toHaveBeenCalledWith('safe-value')
  })

  it('keeps menu keyboard-clickable without exposing secrets', async () => {
    render(
      <TestRouter initialEntries={['/']} registryLoader={readyLoader} />,
    )

    await screen.findByRole('heading', { name: 'ORBIS Admin' })

    const button = screen.getByRole('button', {
      name: 'Open admin menu',
    })
    fireEvent.click(button)
    expect(screen.getByText('No secrets rendered')).toBeTruthy()
  })
})
