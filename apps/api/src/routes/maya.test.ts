import Fastify from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerMayaWorkspaceRoute } from './maya.js'

afterEach(() => vi.unstubAllGlobals())

describe('Maya workspace route', () => {
  it('returns only read-only metadata and disables HTTP caching', async () => {
    const app = Fastify()
    registerMayaWorkspaceRoute(app, async () => ({
      schemaVersion: 'maya.workspace.v1', projectId: 'orbis-maya',
      checkedAt: '2026-10-02T12:00:00Z', revision: null, version: null,
      publicUrl: null, developmentUrl: null,
    }))
    try {
      const result = await app.inject('/api/v1/projects/orbis-maya/workspace')
      expect(result.statusCode).toBe(200)
      expect(result.headers['cache-control']).toBe('no-store')
      expect(result.json().projectId).toBe('orbis-maya')
      expect((await app.inject({ method: 'POST', url: '/api/v1/projects/orbis-maya/workspace' })).statusCode).toBe(404)
    } finally { await app.close() }
  })
  it('defaults to the bounded source reader without granting product control', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const app = Fastify()
    registerMayaWorkspaceRoute(app)
    try {
      expect((await app.inject('/api/v1/projects/orbis-maya/workspace')).json().version).toBeNull()
    } finally { await app.close() }
  })
})
