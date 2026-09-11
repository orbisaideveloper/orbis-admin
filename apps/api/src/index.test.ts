import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { healthResponse } from '@orbis-admin/contracts'
import {
  buildApp,
  resolveDefaultWebRoot,
  startServer,
} from './index'

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

  it('returns the canonical v1 project registry read model', async () => {
    const app = buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
    })
    const body = response.json()

    expect(response.statusCode).toBe(200)
    expect(body.schemaVersion).toBe('v1')
    expect(body.projects).toHaveLength(3)
    expect(body.projects[0]).toMatchObject({
      id: 'orbis-admin',
      repository: 'orbisaideveloper/orbis-admin',
      lifecycle: 'active',
      signals: {
        ci: 'unknown',
        quality: 'unknown',
        deployment: 'unknown',
        health: 'unknown',
      },
    })
    expect(Number.isNaN(Date.parse(body.generatedAt))).toBe(false)

    await app.close()
  })

  it('serves the built web application and preserves API/static 404 boundaries', async () => {
    const webRoot = await mkdtemp(
      join(tmpdir(), 'orbis-admin-web-'),
    )
    await mkdir(join(webRoot, 'assets'))
    await writeFile(
      join(webRoot, 'index.html'),
      '<!doctype html><html><body>ORBIS Admin Runtime</body></html>',
    )
    await writeFile(
      join(webRoot, 'assets', 'app.js'),
      'globalThis.__orbisAdminRuntime = true',
    )

    const app = buildApp({ webRoot })

    try {
      const home = await app.inject({
        method: 'GET',
        url: '/',
      })
      expect(home.statusCode).toBe(200)
      expect(home.headers['content-type']).toContain('text/html')
      expect(home.body).toContain('ORBIS Admin Runtime')

      const asset = await app.inject({
        method: 'GET',
        url: '/assets/app.js',
      })
      expect(asset.statusCode).toBe(200)
      expect(asset.body).toContain('__orbisAdminRuntime')

      const deepRoute = await app.inject({
        method: 'GET',
        url: '/projects/orbis-admin?tab=health',
      })
      expect(deepRoute.statusCode).toBe(200)
      expect(deepRoute.body).toContain('ORBIS Admin Runtime')

      const missingApi = await app.inject({
        method: 'GET',
        url: '/api/v1/missing',
      })
      expect(missingApi.statusCode).toBe(404)
      expect(missingApi.json()).toEqual({
        error: 'Not Found',
      })

      const missingHealth = await app.inject({
        method: 'GET',
        url: '/health/missing',
      })
      expect(missingHealth.statusCode).toBe(404)

      const missingAsset = await app.inject({
        method: 'GET',
        url: '/assets/missing.js',
      })
      expect(missingAsset.statusCode).toBe(404)

      const missingFile = await app.inject({
        method: 'GET',
        url: '/favicon.ico',
      })
      expect(missingFile.statusCode).toBe(404)
    } finally {
      await app.close()
      await rm(webRoot, {
        force: true,
        recursive: true,
      })
    }
  })

  it('resolves the production web root from repo and API-workspace cwd values', () => {
    expect(
      resolveDefaultWebRoot('/workspace/orbis-admin').replaceAll('\\', '/'),
    ).toBe('/workspace/orbis-admin/apps/web/dist')

    expect(
      resolveDefaultWebRoot('/workspace/orbis-admin/apps/api').replaceAll('\\', '/'),
    ).toBe('/workspace/orbis-admin/apps/web/dist')

    expect(resolveDefaultWebRoot().replaceAll('\\', '/')).toContain(
      '/apps/web/dist',
    )
  })

  it('starts and closes the Fastify server without requiring a web build', async () => {
    const app = await startServer(0)

    expect(app.server.listening).toBe(true)

    await app.close()

    expect(app.server.listening).toBe(false)
  })
})
