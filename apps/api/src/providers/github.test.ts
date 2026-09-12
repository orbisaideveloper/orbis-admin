import { describe, expect, it } from 'vitest'
import { createGitHubReader } from './github'

const registration = {
  repositoryFullName: 'orbisaideveloper/orbis-admin',
  defaultBranch: 'main',
}

const jsonResponse = (
  body: unknown,
  status = 200,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  })

describe('GitHub read-only provider', () => {
  it('reads the default-branch head and reports healthy completed checks', async () => {
    const requests: Array<{
      url: string
      authorization?: string
    }> = []

    const reader = createGitHubReader({
      token: 'server-only-token',
      apiBaseUrl: 'https://api.github.example///',
      fetchImpl: async (url, init) => {
        const headers = new Headers(init?.headers)
        requests.push({
          url,
          authorization:
            headers.get('Authorization') ?? undefined,
        })

        if (requests.length === 1) {
          return jsonResponse({
            commit: {
              sha: 'abc123',
            },
          })
        }

        return jsonResponse({
          check_runs: [
            {
              status: 'completed',
              conclusion: 'success',
            },
            {
              status: 'completed',
              conclusion: 'skipped',
            },
          ],
        })
      },
    })

    await expect(reader(registration)).resolves.toEqual({
      repositoryFullName: registration.repositoryFullName,
      branch: 'main',
      headSha: 'abc123',
      ci: 'healthy',
    })

    expect(requests).toHaveLength(2)
    expect(requests[0]?.url).toBe(
      'https://api.github.example/repos/orbisaideveloper/orbis-admin/branches/main',
    )
    expect(requests[1]?.url).toBe(
      'https://api.github.example/repos/orbisaideveloper/orbis-admin/commits/abc123/check-runs?per_page=100',
    )
    expect(
      requests.every(
        (request) =>
          request.authorization ===
          'Bearer server-only-token',
      ),
    ).toBe(true)
  })

  it.each([
    [
      [
        {
          status: 'completed',
          conclusion: 'failure',
        },
      ],
      'attention',
    ],
    [
      [
        {
          status: 'in_progress',
          conclusion: null,
        },
      ],
      'attention',
    ],
    [[], 'unknown'],
  ] as const)(
    'normalizes check runs to %s',
    async (checkRuns, expectedSignal) => {
      let requestNumber = 0
      const reader = createGitHubReader({
        fetchImpl: async () => {
          requestNumber += 1
          return requestNumber === 1
            ? jsonResponse({
                commit: {
                  sha: 'def456',
                },
              })
            : jsonResponse({
                check_runs: checkRuns,
              })
        },
      })

      const result = await reader(registration)
      expect(result.headSha).toBe('def456')
      expect(result.ci).toBe(expectedSignal)
    },
  )

  it('keeps a valid head SHA but degrades CI to unknown when checks cannot be read', async () => {
    let requestNumber = 0
    const reader = createGitHubReader({
      fetchImpl: async () => {
        requestNumber += 1
        return requestNumber === 1
          ? jsonResponse({
              commit: {
                sha: 'head789',
              },
            })
          : jsonResponse(
              {
                message: 'rate limited',
              },
              403,
            )
      },
    })

    await expect(reader(registration)).resolves.toEqual({
      repositoryFullName: registration.repositoryFullName,
      branch: 'main',
      headSha: 'head789',
      ci: 'unknown',
    })
  })

  it.each([
    ['invalid repository registration', {
      repositoryFullName: 'not-a-full-name',
      defaultBranch: 'main',
    }],
    ['empty branch registration', {
      repositoryFullName: 'orbisaideveloper/orbis-admin',
      defaultBranch: '   ',
    }],
  ])(
    'returns unknown without a request for %s',
    async (_label, invalidRegistration) => {
      let called = false
      const reader = createGitHubReader({
        fetchImpl: async () => {
          called = true
          return jsonResponse({})
        },
      })

      const result = await reader(invalidRegistration)
      expect(result.headSha).toBeNull()
      expect(result.ci).toBe('unknown')
      expect(called).toBe(false)
    },
  )

  it.each([
    ['branch request failure', async () =>
      jsonResponse({ message: 'not found' }, 404)],
    ['missing branch commit payload', async () =>
      jsonResponse({})],
    ['malformed branch payload', async () =>
      jsonResponse({ commit: {} })],
    ['network failure', async () => {
      throw new Error('network unavailable')
    }],
  ])(
    'fails closed to unknown for %s',
    async (_label, fetchImpl) => {
      const reader = createGitHubReader({
        fetchImpl,
      })

      await expect(reader(registration)).resolves.toEqual({
        repositoryFullName: registration.repositoryFullName,
        branch: 'main',
        headSha: null,
        ci: 'unknown',
      })
    },
  )

  it.each([
    ['missing check_runs array', {}],
    [
      'malformed check entry',
      {
        check_runs: [
          {
            status: 123,
            conclusion: 'success',
          },
        ],
      },
    ],
  ])(
    'degrades %s to unknown without losing the head SHA',
    async (_label, checksPayload) => {
      let requestNumber = 0
      const reader = createGitHubReader({
        fetchImpl: async () => {
          requestNumber += 1
          return requestNumber === 1
            ? jsonResponse({
                commit: {
                  sha: 'sha-valid',
                },
              })
            : jsonResponse(checksPayload)
        },
      })

      const result = await reader(registration)
      expect(result.headSha).toBe('sha-valid')
      expect(result.ci).toBe('unknown')
    },
  )
})
