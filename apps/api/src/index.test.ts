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
import { readProjectRegistry } from './registry/projects'

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

  it('reports the exact Render runtime revision when available', async () => {
    const previousRevision =
      process.env.RENDER_GIT_COMMIT

    process.env.RENDER_GIT_COMMIT =
      '0123456789abcdef0123456789abcdef01234567'

    const app = buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({
        status: 'ok',
        service: 'orbis-admin-api',
        revision:
          '0123456789abcdef0123456789abcdef01234567',
      })
    } finally {
      if (previousRevision === undefined) {
        delete process.env.RENDER_GIT_COMMIT
      } else {
        process.env.RENDER_GIT_COMMIT =
          previousRevision
      }

      await app.close()
    }
  })

  it('returns the canonical v1 project registry read model', async () => {
    const app = buildApp({
      projectRegistryReader: () =>
        readProjectRegistry(
          new Date('2026-09-12T05:45:00.000Z'),
          async (registration) => ({
            repositoryFullName:
              registration.repositoryFullName,
            branch: registration.defaultBranch,
            headSha: null,
            ci: 'unknown',
          }),
          async (registration) => ({
            serviceId: registration.serviceId,
            serviceName: registration.serviceName,
            branch: registration.branch,
            region: registration.region,
            deployId: 'dep-route',
            commitId: 'render-route-head',
            deployment: 'healthy',
          }),
        ),
    })

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
        deployment: 'healthy',
        health: 'unknown',
      },
    })
    expect(Number.isNaN(Date.parse(body.generatedAt))).toBe(false)

    await app.close()
  })

  it('uses the default project registry reader when no override is injected', async () => {
    const originalFetch = globalThis.fetch
    const originalRenderToken =
      process.env.ORBIS_RENDER_TOKEN
    delete process.env.ORBIS_RENDER_TOKEN

    const requests: string[] = []

    globalThis.fetch = (async (
      input: string | URL | Request,
    ) => {
      const url = String(input)
      requests.push(url)

      if (url.includes('/branches/')) {
        return new Response(
          JSON.stringify({
            commit: {
              sha: url.includes('/orbis-admin/')
                ? 'admin-route-head'
                : 'foundation-route-head',
            },
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        )
      }

      return new Response(
        JSON.stringify({
          check_runs: [
            {
              status: 'completed',
              conclusion: 'success',
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      )
    }) as typeof fetch

    const app = buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
      })
      const body = response.json()

      expect(response.statusCode).toBe(200)
      expect(requests).toHaveLength(4)
      expect(body.projects[0].signals.ci).toBe('healthy')
      expect(body.projects[1].signals.ci).toBe('healthy')
      expect(body.projects[2].signals.ci).toBe('unknown')
    } finally {
      globalThis.fetch = originalFetch

      if (originalRenderToken === undefined) {
        delete process.env.ORBIS_RENDER_TOKEN
      } else {
        process.env.ORBIS_RENDER_TOKEN =
          originalRenderToken
      }

      await app.close()
    }
  })

  it('reuses the Render cache across repeated project registry requests', async () => {
    const originalFetch = globalThis.fetch
    const originalRenderToken =
      process.env.ORBIS_RENDER_TOKEN

    process.env.ORBIS_RENDER_TOKEN =
      'render-cache-test-token'

    const renderRequests: string[] = []

    globalThis.fetch = (async (
      input: string | URL | Request,
    ) => {
      const url = String(input)

      if (url.startsWith('https://api.render.com/')) {
        renderRequests.push(url)

        if (url.includes('/deploys?')) {
          return new Response(
            JSON.stringify([
              {
                deploy: {
                  id: 'dep-cache-test',
                  status: 'live',
                  commit: {
                    id: 'render-cache-head',
                  },
                },
              },
            ]),
            {
              status: 200,
              headers: {
                'content-type': 'application/json',
              },
            },
          )
        }

        return new Response(
          JSON.stringify({
            id: 'srv-dai144uq1p3s73ajc1ag',
            name: 'orbis-admin-staging',
            branch: 'staging',
            suspended: 'not_suspended',
            serviceDetails: {
              region: 'singapore',
            },
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        )
      }

      if (url.includes('/branches/')) {
        return new Response(
          JSON.stringify({
            commit: {
              sha: 'github-cache-test-head',
            },
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        )
      }

      return new Response(
        JSON.stringify({
          check_runs: [
            {
              status: 'completed',
              conclusion: 'success',
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      )
    }) as typeof fetch

    const app = buildApp()

    try {
      const first = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
      })
      const second = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
      })

      expect(first.statusCode).toBe(200)
      expect(second.statusCode).toBe(200)

      expect(
        first.json().projects[0].signals.deployment,
      ).toBe('healthy')

      expect(
        second.json().projects[0].signals.deployment,
      ).toBe('healthy')

      expect(renderRequests).toHaveLength(2)
    } finally {
      globalThis.fetch = originalFetch

      if (originalRenderToken === undefined) {
        delete process.env.ORBIS_RENDER_TOKEN
      } else {
        process.env.ORBIS_RENDER_TOKEN =
          originalRenderToken
      }

      await app.close()
    }
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
