import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

const routeCases: Array<[string, string]> = [
  ['home', 'Command Center'],
  ['projects', 'Projects'],
  ['foundation', 'ORBIS Foundation'],
  ['actions', 'GitHub Actions'],
  ['sonar', 'Sonar Quality'],
  ['render', 'Render / Environments'],
  ['users', 'Central Users'],
  ['settings', 'Settings / Integrations'],
  ['activity', 'Activity / Audit'],
  ['review', 'Review / Publish'],
  ['alerts', 'Alerts / Incidents'],
  ['health', 'Service Health'],
  ['foundation-actions', 'Foundation · GitHub Actions'],
  ['foundation-sonar', 'Foundation · Sonar Quality'],
  ['foundation-render', 'Foundation · Render'],
  ['foundation-runtime', 'Foundation · Runtime'],
  ['foundation-modules', 'Foundation · Modules / Models'],
  ['foundation-users', 'Foundation · Users'],
  ['foundation-versions', 'Foundation · Versions'],
  ['foundation-quality', 'Foundation · Health & Quality'],
]

function setRoute(route?: string) {
  window.history.replaceState(
    {},
    '',
    route ? `#${route}` : '/',
  )
}

function buttonContaining(text: string) {
  const node = screen.getByText(text)
  const button = node.closest('button')

  if (!button) {
    throw new Error(`No button found for ${text}`)
  }

  return button
}

describe('ORBIS Admin V1 shell', () => {
  it.each(routeCases)(
    'renders route %s',
    (route, expectedHeading) => {
      setRoute(route)
      render(<App />)

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: expectedHeading,
        }),
      ).toBeInTheDocument()
    },
  )

  it('falls back to home for empty and unknown routes', () => {
    setRoute()
    const first = render(<App />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Command Center',
      }),
    ).toBeInTheDocument()

    first.unmount()

    setRoute('not-a-real-route')
    render(<App />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Command Center',
      }),
    ).toBeInTheDocument()
  })

  it('drills from home through Projects and Foundation', () => {
    setRoute('home')
    render(<App />)

    fireEvent.click(buttonContaining('Projects'))

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Projects',
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: /ORBIS Game/i,
      }),
    ).toBeDisabled()

    fireEvent.click(
      screen.getByRole('button', {
        name: /ORBIS Foundation/i,
      }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'ORBIS Foundation',
      }),
    ).toBeInTheDocument()

    fireEvent.click(buttonContaining('Runtime'))

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Foundation · Runtime',
      }),
    ).toBeInTheDocument()
  })

  it('uses browser Back when internal history has depth', () => {
    setRoute('home')
    render(<App />)

    fireEvent.click(buttonContaining('Projects'))

    const backSpy = vi
      .spyOn(window.history, 'back')
      .mockImplementation(() => undefined)

    fireEvent.click(
      screen.getByRole('button', {
        name: /Back/i,
      }),
    )

    expect(backSpy).toHaveBeenCalledTimes(1)

    backSpy.mockRestore()
  })

  it('returns home when Back starts from a direct secondary route', () => {
    setRoute('settings')
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: /Back/i,
      }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Command Center',
      }),
    ).toBeInTheDocument()
  })

  it('supports Home and top brand navigation', () => {
    setRoute('settings')
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: /Home/i,
      }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Command Center',
      }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Go to ORBIS Command Center',
      }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Command Center',
      }),
    ).toBeInTheDocument()
  })

  it('opens and uses the three-dot navigation menu', () => {
    setRoute('home')
    render(<App />)

    const menuButton = screen.getByRole('button', {
      name: 'Open navigation menu',
    })

    expect(menuButton).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(menuButton)

    expect(menuButton).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Settings',
      }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Settings / Integrations',
      }),
    ).toBeInTheDocument()
  })

  it('handles same-route navigation from the menu', () => {
    setRoute('home')
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open navigation menu',
      }),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Command Center',
      }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Command Center',
      }),
    ).toBeInTheDocument()
  })

  it('opens project detail from aggregate GitHub Actions', () => {
    setRoute('actions')
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: /ORBIS Foundation.*Required GitHub workflow checks/i,
      }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Foundation · GitHub Actions',
      }),
    ).toBeInTheDocument()
  })

  it('opens project detail from aggregate Sonar Quality', () => {
    setRoute('sonar')
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: /ORBIS Foundation.*orbisaideveloper_orbis-foundation/i,
      }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Foundation · Sonar Quality',
      }),
    ).toBeInTheDocument()
  })

  it('opens project detail from aggregate Render view', () => {
    setRoute('render')
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: /ORBIS Foundation.*Production and staging services/i,
      }),
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Foundation · Render',
      }),
    ).toBeInTheDocument()
  })

  it('tracks browser popstate through known, new and invalid routes', () => {
    setRoute('home')
    render(<App />)

    fireEvent.click(buttonContaining('Projects'))

    act(() => {
      window.history.replaceState({}, '', '#home')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Command Center',
      }),
    ).toBeInTheDocument()

    act(() => {
      window.history.replaceState({}, '', '#sonar')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Sonar Quality',
      }),
    ).toBeInTheDocument()

    act(() => {
      window.history.replaceState({}, '', '#invalid-route')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Command Center',
      }),
    ).toBeInTheDocument()
  })

  it('copies safe values and clears the success toast', async () => {
    vi.useFakeTimers()

    const writeText = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    setRoute('settings')
    render(<App />)

    await act(async () => {
      fireEvent.click(
        screen.getAllByRole('button', {
          name: 'Copy',
        })[0],
      )
      await Promise.resolve()
    })

    expect(writeText).toHaveBeenCalled()
    expect(screen.getByText('Copied')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1200)
    })

    expect(screen.queryByText('Copied')).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  it('shows a safe message when clipboard copy fails', async () => {
    vi.useFakeTimers()

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi
          .fn()
          .mockRejectedValue(new Error('clipboard unavailable')),
      },
    })

    setRoute('foundation-actions')
    render(<App />)

    await act(async () => {
      fireEvent.click(
        screen.getAllByRole('button', {
          name: 'Copy',
        })[0],
      )
      await Promise.resolve()
    })

    expect(
      screen.getByText('Copy unavailable'),
    ).toBeInTheDocument()

    act(() => {
      vi.runOnlyPendingTimers()
    })

    vi.useRealTimers()
  })

  it('updates the live clock interval', () => {
    vi.useFakeTimers()

    setRoute('home')
    render(<App />)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(
      screen.getByRole('button', {
        name: 'Open navigation menu',
      }),
    ).toBeInTheDocument()

    vi.useRealTimers()
  })
})
