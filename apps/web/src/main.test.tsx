import { describe, expect, it, vi } from 'vitest'

const reactDomMocks = vi.hoisted(() => {
  const render = vi.fn()

  return {
    render,
    createRoot: vi.fn(() => ({ render })),
  }
})

vi.mock('react-dom/client', () => ({
  createRoot: reactDomMocks.createRoot,
}))

describe('ORBIS Admin web bootstrap', () => {
  it('mounts the application into the root element', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    const rootElement = document.getElementById('root')

    await import('./main')

    expect(reactDomMocks.createRoot).toHaveBeenCalledWith(rootElement)
    expect(reactDomMocks.render).toHaveBeenCalledTimes(1)
  })
})
