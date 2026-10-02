import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMayaWorkspaceReader } from './maya.js'

const revision = 'a'.repeat(40)
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })
const mockSource = () => vi.fn<typeof fetch>()
  .mockResolvedValueOnce(response({ commit: { sha: revision } }))
  .mockResolvedValueOnce(response({ name: 'orbis-maya', version: '0.1.0', secret: 'not-output' }))

afterEach(() => vi.unstubAllGlobals())

describe('Maya read-only source adapter', () => {
  it('shares an in-flight request and expires its cache after one minute', async () => {
    let timestamp = 0
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (url) =>
      response(String(url).includes('branches') ? { commit: { sha: revision } } :
        { name: 'orbis-maya', version: '0.1.0' }))
    const read = createMayaWorkspaceReader({ fetchImpl, now: () => new Date(timestamp) })
    const first = read()
    expect(read()).toBe(first)
    await first
    timestamp = 59_999
    expect(read()).toBe(first)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    timestamp = 60_000
    expect(read()).not.toBe(first)
    await read()
    expect(fetchImpl).toHaveBeenCalledTimes(4)
  })
  it('pins the package read to the exact main revision and keeps credentials server-side', async () => {
    const fetchImpl = mockSource()
    const result = await createMayaWorkspaceReader({ fetchImpl, token: ' token ',
      publicUrl: 'https://maya.example', developmentUrl: 'https://review.example',
      now: () => new Date('2026-10-02T12:00:00Z') })()
    expect(result).toEqual({ schemaVersion: 'maya.workspace.v1', projectId: 'orbis-maya',
      checkedAt: '2026-10-02T12:00:00.000Z', revision, version: '0.1.0',
      publicUrl: 'https://maya.example/', developmentUrl: 'https://review.example/' })
    expect(fetchImpl.mock.calls[1][0]).toContain(`contents/package.json?ref=${revision}`)
    expect(fetchImpl.mock.calls[1][1]).toMatchObject({ redirect: 'error',
      headers: { Authorization: 'Bearer token', Accept: 'application/vnd.github.raw+json' } })
    expect(JSON.stringify(result)).not.toContain('token')
  })
  it('works with default fetch and clock', async () => {
    vi.stubGlobal('fetch', mockSource())
    const value = await createMayaWorkspaceReader()()
    expect(value.revision).toBe(revision)
    expect(Number.isFinite(Date.parse(value.checkedAt))).toBe(true)
    expect(value.publicUrl).toBeNull()
  })
  it.each([null, 'invalid', {}, { commit: null }, { commit: { sha: 2 } }, { commit: { sha: 'invalid' } }])('leaves revision unknown for malformed branches %j', async (body) => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response(body))
    expect((await createMayaWorkspaceReader({ fetchImpl, token: ' ' })()).revision).toBeNull()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
  it.each([null, {}, { name: 'other', version: '1' }, { name: 'orbis-maya', version: 2 },
    { name: 'orbis-maya', version: 'x'.repeat(81) }])('does not invent a version from invalid package data %j', async (body) => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ commit: { sha: revision } }))
      .mockResolvedValueOnce(response(body))
    expect((await createMayaWorkspaceReader({ fetchImpl })()).version).toBeNull()
  })
  it.each(['http', 'json', 'size', 'timeout'])('contains %s failures', async (kind) => {
    const fetchImpl = vi.fn<typeof fetch>()
    if (kind === 'http') fetchImpl.mockResolvedValue(response({}, 503))
    if (kind === 'json') fetchImpl.mockResolvedValue(new Response('invalid-json'))
    if (kind === 'size') fetchImpl.mockResolvedValue(new Response('x'.repeat(65_537)))
    if (kind === 'timeout') fetchImpl.mockRejectedValue(new Error('timeout'))
    expect((await createMayaWorkspaceReader({ fetchImpl })()).revision).toBeNull()
  })
  it('retains the known revision when its package fetch fails', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ commit: { sha: revision } }))
      .mockRejectedValueOnce(new Error('offline'))
    const value = await createMayaWorkspaceReader({ fetchImpl })()
    expect(value.revision).toBe(revision)
    expect(value.version).toBeNull()
  })
})
