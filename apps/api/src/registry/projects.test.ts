import { describe, expect, it } from 'vitest'
import {
  readProjectRegistry,
  registeredProjects,
} from './projects'

const unknownReader = async (registration: {
  repositoryFullName: string
  defaultBranch: string
}) => ({
  repositoryFullName: registration.repositoryFullName,
  branch: registration.defaultBranch,
  headSha: null,
  ci: 'unknown' as const,
})

describe('canonical project registry', () => {
  it('keeps registration metadata separate from live provider signals', () => {
    expect(registeredProjects).toHaveLength(3)

    const admin = registeredProjects[0]
    expect(admin.id).toBe('orbis-admin')
    expect(admin.providers.github.repositoryFullName).toBe(
      'orbisaideveloper/orbis-admin',
    )
    expect(admin.providers.render.serviceName).toBe(
      'orbis-admin-staging',
    )
    expect(admin.providers.sonar.projectKey).toBe(
      'orbisaideveloper_orbis-admin',
    )
    expect(admin.signals).toEqual({
      ci: 'unknown',
      quality: 'unknown',
      deployment: 'unknown',
      health: 'unknown',
    })

    expect(registeredProjects[1].lifecycle).toBe('external')
    expect(registeredProjects[2].lifecycle).toBe('planned')
    expect(registeredProjects[2].repository).toBeNull()
  })

  it('returns a deterministic v1 read model when a clock and reader are supplied', async () => {
    const response = await readProjectRegistry(
      new Date('2026-09-11T17:30:00.000Z'),
      unknownReader,
    )

    expect(response).toEqual({
      schemaVersion: 'v1',
      generatedAt: '2026-09-11T17:30:00.000Z',
      projects: registeredProjects,
    })
  })

  it('enriches only GitHub-registered projects with live CI state', async () => {
    const registrations: string[] = []

    const response = await readProjectRegistry(
      new Date('2026-09-12T05:00:00.000Z'),
      async (registration) => {
        registrations.push(registration.repositoryFullName)

        return {
          repositoryFullName:
            registration.repositoryFullName,
          branch: registration.defaultBranch,
          headSha: registration.repositoryFullName.endsWith(
            '/orbis-admin',
          )
            ? 'admin-head'
            : 'foundation-head',
          ci: registration.repositoryFullName.endsWith(
            '/orbis-admin',
          )
            ? 'healthy'
            : 'attention',
        }
      },
    )

    expect(registrations).toEqual([
      'orbisaideveloper/orbis-admin',
      'orbisaideveloper/orbis-foundation',
    ])

    expect(response.projects[0].release).toEqual(
      registeredProjects[0].release,
    )
    expect(response.projects[0].signals.ci).toBe('healthy')

    expect(response.projects[1].release).toEqual(
      registeredProjects[1].release,
    )
    expect(response.projects[1].signals.ci).toBe('attention')

    expect(response.projects[2]).toEqual(
      registeredProjects[2],
    )
  })

  it('uses the server-side default GitHub reader when none is injected', async () => {
    const originalFetch = globalThis.fetch
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
                ? 'admin-live-head'
                : 'foundation-live-head',
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

    try {
      const response = await readProjectRegistry(
        new Date('2026-09-12T05:30:00.000Z'),
      )

      expect(requests).toHaveLength(4)
      expect(response.projects[0].release).toEqual(
        registeredProjects[0].release,
      )
      expect(response.projects[0].signals.ci).toBe('healthy')

      expect(response.projects[1].release).toEqual(
        registeredProjects[1].release,
      )
      expect(response.projects[1].signals.ci).toBe('healthy')

      expect(response.projects[2]).toEqual(
        registeredProjects[2],
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
