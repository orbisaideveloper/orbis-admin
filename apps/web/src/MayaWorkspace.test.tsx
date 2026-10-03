import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MayaWorkspace, loadMayaWorkspace } from './MayaWorkspace'
import type { MayaWorkspace as Workspace } from '@orbis-admin/contracts'

const data: Workspace = {
  schemaVersion: 'maya.workspace.v1', projectId: 'orbis-maya',
  checkedAt: '2026-10-02T12:00:00Z', revision: 'a'.repeat(40), version: '0.1.0',
  publicUrl: 'https://maya.example/', developmentUrl: 'https://review.example/',
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('Maya workspace views and automatic refresh', () => {
  it('loads and validates the same-origin workspace endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(data)))
    vi.stubGlobal('fetch', fetcher)
    expect(await loadMayaWorkspace()).toEqual(data)
    expect(fetcher.mock.calls[0][0]).toBe('/api/v1/projects/orbis-maya/workspace')
    fetcher.mockResolvedValue(new Response('{}', { status: 503 }))
    await expect(loadMayaWorkspace()).rejects.toThrow('Maya workspace unavailable')
    fetcher.mockResolvedValue(new Response('{}'))
    await expect(loadMayaWorkspace()).rejects.toThrow('Invalid Maya workspace')
  })
  it('opens both isolated views and a full-screen link', async () => {
    render(<MayaWorkspace load={async () => data} />)
    expect(screen.getByText('তথ্য সংগ্রহ হচ্ছে…')).toBeTruthy()
    await screen.findByText('0.1.0')
    expect(screen.getByTitle('Maya app preview').getAttribute('src')).toBe(data.developmentUrl)
    fireEvent.click(screen.getByRole('button', { name: 'Published view' }))
    expect(screen.getByTitle('Maya app preview').getAttribute('src')).toBe(data.publicUrl)
    expect(screen.getByRole('link', { name: 'পূর্ণ স্ক্রিনে খুলুন ↗' }).getAttribute('rel')).toBe('noopener noreferrer')
    fireEvent.click(screen.getByRole('button', { name: 'Development view' }))
    expect(screen.getByTitle('Maya app preview').getAttribute('src')).toBe(data.developmentUrl)
  })
  it('disables missing views and reports unknown source fields', async () => {
    render(<MayaWorkspace load={async () => ({ ...data, version: null, revision: null,
      publicUrl: null, developmentUrl: null })} />)
    await screen.findAllByText('সংযুক্ত নয়')
    expect((screen.getByRole('button', { name: 'Published view' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('uses the default loader and displays a failed initial load', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<MayaWorkspace />)
    expect(await screen.findByText(/আপডেট পাওয়া যায়নি/)).toBeTruthy()
  })
  it('refreshes after completion, preserves stale data on failure and recovers', async () => {
    vi.useFakeTimers()
    const load = vi.fn().mockResolvedValueOnce(data)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ...data, version: '0.2.0', publicUrl: null })
    render(<MayaWorkspace load={load} />)
    await act(async () => { await Promise.resolve() })
    fireEvent.click(screen.getByRole('button', { name: 'Published view' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(screen.getByText('0.1.0')).toBeTruthy()
    expect(screen.getByText(/পুরোনো হতে পারে/)).toBeTruthy()
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(screen.getByText('0.2.0')).toBeTruthy()
    expect(screen.queryByTitle('Maya app preview')).toBeNull()
  })
  it.each([false, true])('ignores a pending result after unmount (reject=%s)', async (reject) => {
    let settle!: (value: Workspace) => void
    let fail!: (reason: Error) => void
    const promise = new Promise<Workspace>((resolve, rejectPromise) => { settle = resolve; fail = rejectPromise })
    const view = render(<MayaWorkspace load={() => promise} />)
    view.unmount()
    await act(async () => { if (reject) fail(new Error('offline')); else settle(data) })
    expect(screen.queryByRole('region', { name: 'Maya app views' })).toBeNull()
  })
})
