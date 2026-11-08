import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { installRuntimeDiagnostics } from './runtime-diagnostics'
import { startServer } from './index'

function harness() {
  const sink = { info: vi.fn(), warn: vi.fn() }
  const app = Fastify({ logger: false })
  installRuntimeDiagnostics(app, sink)
  app.get('/health', () => ({ status: 'ok' }))
  app.post('/api/v1/customer/login', async (request, reply) => {
    const input = request.body as { testCase?: string }
    return input?.testCase === 'ok' ? { ok: true } : reply.code(503).send({ error: 'TEST_ERROR' })
  })
  return { app, sink }
}

describe('minimal runtime diagnostics', () => {
  it('logs first request and first health only once', async () => {
    const { app, sink } = harness()
    try {
      await app.inject({ method: 'GET', url: '/health?secret=NOT_IN_LOG', headers: { authorization: 'Bearer NOT_IN_LOG' } })
      await app.inject({ method: 'GET', url: '/health' })
      expect(sink.info.mock.calls).toEqual([
        ['[orbis-admin-runtime] first_http_request_received'],
        ['[orbis-admin-runtime] first_health_request_received'],
      ])
      expect(JSON.stringify(sink.info.mock.calls)).not.toContain('NOT_IN_LOG')
    } finally { await app.close() }
  })

  it('does not record successful login', async () => {
    const { app, sink } = harness()
    try {
      const response = await app.inject({ method: 'POST', url: '/api/v1/customer/login', payload: { testCase: 'ok', password: 'NOT_IN_LOG' } })
      expect(response.statusCode).toBe(200)
      expect(sink.warn).not.toHaveBeenCalled()
    } finally { await app.close() }
  })

  it('records failure status only, never credentials or identifiers', async () => {
    const { app, sink } = harness()
    try {
      const response = await app.inject({ method: 'POST', url: '/api/v1/customer/login', payload: { testCase: 'fail', password: 'NOT_IN_LOG' } })
      expect(response.statusCode).toBe(503)
      expect(sink.warn.mock.calls).toEqual([['[orbis-admin-runtime] login_http_failure', 503]])
      expect(JSON.stringify(sink.warn.mock.calls)).not.toContain('NOT_IN_LOG')
    } finally { await app.close() }
  })
})


describe('Admin startup failure logging', () => {
  it('logs only the startup failure stage and propagates a listen failure', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await expect(startServer(-1)).rejects.toThrow()
      expect(errorLog).toHaveBeenCalledWith('[orbis-admin-runtime] startup_failed')
    } finally {
      errorLog.mockRestore()
    }
  })
})
