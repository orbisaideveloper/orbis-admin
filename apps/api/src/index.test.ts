import { describe, expect, it } from 'vitest'
import { healthResponse } from '@orbis-admin/contracts'
import { buildApp, startServer } from './index'

describe('ORBIS Admin API', () => {
  it('returns the shared health contract', async () => {
    const app = buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(healthResponse)

    await app.close()
  })

  it('starts and closes the Fastify server', async () => {
    const app = await startServer(0)

    expect(app.server.listening).toBe(true)

    await app.close()

    expect(app.server.listening).toBe(false)
  })
})
