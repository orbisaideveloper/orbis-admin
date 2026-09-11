import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App, { TestRouter, copyText, formatDateTime } from './App'

const clipboardWrite = vi.fn<(value: string) => Promise<void>>()

beforeEach(() => {
  clipboardWrite.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: clipboardWrite },
  })
})

afterEach(() => {
  vi.useRealTimers()
  clipboardWrite.mockClear()
})

describe('ORBIS Admin V1 shell', () => {
  it('mounts the production BrowserRouter entry component', () => {
    window.history.replaceState({}, '', '/')
    const view = render(<App />)
    expect(screen.getByRole('heading', { name: 'ORBIS Admin' })).toBeTruthy()
    view.unmount()
  })

  it('renders the compact command center and opens the menu', async () => {
    const user = userEvent.setup()
    const view = render(<TestRouter initialEntries={['/']} />)

    expect(screen.getByRole('heading', { name: 'ORBIS Admin' })).toBeTruthy()
    expect(screen.getAllByText('Projects').length).toBeGreaterThan(0)
    expect(screen.getByText('Central Users')).toBeTruthy()
    expect(screen.getByText('Sonar Quality')).toBeTruthy()

    const menuButton = screen.getByRole('button', { name: 'Open admin menu' })
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')
    await user.click(menuButton)
    expect(menuButton.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('menuitem', { name: 'Read-only V1' })).toBeTruthy()
    await user.click(menuButton)
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')

    view.unmount()
  })

  it('shows project registry, project details and provider link', async () => {
    const user = userEvent.setup()
    render(<TestRouter initialEntries={['/']} />)

    await user.click(screen.getByRole('link', { name: /Projects Open the registry/i }))
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeTruthy()

    await user.click(screen.getByRole('link', { name: /Control Plane ORBIS Admin/i }))
    expect(screen.getByRole('heading', { name: 'ORBIS Admin' })).toBeTruthy()
    expect(screen.getByText('Step 4')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open in GitHub ↗' }).getAttribute('href')).toContain('orbis-admin')
  })

  it('opens a category and project-specific detail', async () => {
    const user = userEvent.setup()
    render(<TestRouter initialEntries={['/category/sonar']} />)

    expect(screen.getByRole('heading', { name: 'Sonar Quality' })).toBeTruthy()
    await user.click(screen.getByRole('link', { name: /ORBIS Admin.*Open Sonar Quality detail/i }))
    expect(screen.getByRole('heading', { name: 'Sonar Quality' })).toBeTruthy()
    expect(screen.getByText(/V1 safety boundary/)).toBeTruthy()
    expect(screen.getByText(/repository=orbisaideveloper\/orbis-admin/)).toBeTruthy()
  })

  it('copies safe repository and diagnostic values', async () => {
    const user = userEvent.setup()

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWrite },
    })

    render(<TestRouter initialEntries={['/detail/github/orbis-admin']} />)

    const copyButtons = screen.getAllByRole('button', { name: 'Copy' })
    await user.click(copyButtons[0])
    expect(clipboardWrite).toHaveBeenCalledWith('orbisaideveloper/orbis-admin')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Copy|Copied/ })).toHaveLength(2)
  })

  it('supports Home and Back navigation controls', async () => {
    const user = userEvent.setup()
    render(<TestRouter initialEntries={['/', '/projects', '/projects/orbis-admin']} />)

    expect(screen.getByText('orbisaideveloper/orbis-admin')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Go back one screen' }))
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeTruthy()
    await user.click(screen.getByRole('link', { name: '⌂ Home' }))
    expect(screen.getByRole('heading', { name: 'ORBIS Admin' })).toBeTruthy()
  })

  it('renders not-found states for unknown routes and unknown records', () => {
    const first = render(<TestRouter initialEntries={['/unknown']} />)
    expect(screen.getByRole('heading', { name: 'Admin view not found' })).toBeTruthy()
    first.unmount()

    const second = render(<TestRouter initialEntries={['/projects/missing']} />)
    expect(screen.getByRole('heading', { name: 'Admin view not found' })).toBeTruthy()
    second.unmount()

    const third = render(<TestRouter initialEntries={['/category/missing']} />)
    expect(screen.getByRole('heading', { name: 'Admin view not found' })).toBeTruthy()
    third.unmount()

    const fourth = render(<TestRouter initialEntries={['/detail/missing/orbis-admin']} />)
    expect(screen.getByRole('heading', { name: 'Admin view not found' })).toBeTruthy()
    fourth.unmount()

    render(<TestRouter initialEntries={['/detail/github/missing']} />)
    expect(screen.getByRole('heading', { name: 'Admin view not found' })).toBeTruthy()
  })

  it('covers project cards without provider links and every project-area card', () => {
    const view = render(<TestRouter initialEntries={['/projects/orbis-game']} />)
    expect(screen.getByText('Not registered')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Open in GitHub ↗' })).toBeNull()
    expect(screen.getByRole('link', { name: /GitHub Actions/ })).toBeTruthy()
    view.unmount()

    render(<TestRouter initialEntries={['/projects/orbis-foundation']} />)
    expect(screen.getByRole('heading', { name: 'ORBIS Foundation' })).toBeTruthy()
  })

  it('formats visible date and time and refreshes the clock timer', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-11T10:30:00+05:30'))
    const formatted = formatDateTime(new Date())
    expect(formatted.date).toContain('2026')
    expect(formatted.time.length).toBeGreaterThan(0)

    const view = render(<TestRouter initialEntries={['/']} />)
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByLabelText('Current admin date and time')).toBeTruthy()
    view.unmount()
  })

  it('exposes copyText as the single safe clipboard primitive', async () => {
    await copyText('safe-value')
    expect(clipboardWrite).toHaveBeenCalledWith('safe-value')
  })

  it('handles the optional detail copy control and project navigation links', () => {
    render(<TestRouter initialEntries={['/detail/health/orbis-game']} />)
    expect(screen.getAllByRole('button', { name: 'Copy' })).toHaveLength(2)
    expect(screen.getAllByText('Planned').length).toBeGreaterThan(0)
  })

  it('keeps menu keyboard-clickable without exposing secrets', () => {
    render(<TestRouter initialEntries={['/']} />)
    const button = screen.getByRole('button', { name: 'Open admin menu' })
    fireEvent.click(button)
    expect(screen.getByText('No secrets rendered')).toBeTruthy()
  })
})
