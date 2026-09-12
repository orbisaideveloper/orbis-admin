import { describe, expect, it } from 'vitest'
import { createRenderReader } from './render'

const registration = {
  serviceId: 'srv-dai144uq1p3s73ajc1ag',
  serviceName: 'orbis-admin-staging',
  branch: 'staging',
  region: 'singapore',
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

const healthyService = {
  id: registration.serviceId,
  name: registration.serviceName,
  branch: registration.branch,
  suspended: 'not_suspended',
  serviceDetails: {
    region: registration.region,
  },
}

const liveDeploy = {
  id: 'dep-dai8omtg1s2s738hl4bg',
  status: 'live',
  commit: {
    id: '69803a2064cd522dcf85f19c6faf4751d550e265',
  },
}

describe('Render read-only provider', () => {
  it('reads a matching live service and latest deploy', async () => {
    const requests: Array<{
      url: string
      authorization?: string
    }> = []

    const reader = createRenderReader({
      token: '  render-server-token  ',
      apiBaseUrl: 'https://api.render.example///',
      fetchImpl: async (url, init) => {
        const headers = new Headers(init?.headers)

        requests.push({
          url,
          authorization:
            headers.get('Authorization') ?? undefined,
        })

        return requests.length === 1
          ? jsonResponse(healthyService)
          : jsonResponse([
              {
                deploy: liveDeploy,
                cursor: 'next-cursor',
              },
            ])
      },
    })

    await expect(reader(registration)).resolves.toEqual({
      serviceId: registration.serviceId,
      serviceName: registration.serviceName,
      branch: registration.branch,
      region: registration.region,
      deployId: liveDeploy.id,
      commitId: liveDeploy.commit.id,
      deployment: 'healthy',
    })

    expect(requests).toHaveLength(2)
    expect(requests[0]?.url).toBe(
      `https://api.render.example/v1/services/${registration.serviceId}`,
    )
    expect(requests[1]?.url).toBe(
      `https://api.render.example/v1/services/${registration.serviceId}/deploys?limit=1`,
    )
    expect(
      requests.every(
        (request) =>
          request.authorization ===
          'Bearer render-server-token',
      ),
    ).toBe(true)
  })

  it('accepts top-level region and direct deploy entries', async () => {
    let requestNumber = 0

    const reader = createRenderReader({
      token: 'token',
      fetchImpl: async () => {
        requestNumber += 1

        return requestNumber === 1
          ? jsonResponse({
              ...healthyService,
              region: registration.region,
              serviceDetails: undefined,
            })
          : jsonResponse([liveDeploy])
      },
    })

    const result = await reader(registration)

    expect(result.deployment).toBe('healthy')
    expect(result.deployId).toBe(liveDeploy.id)
  })

  it('reports attention for a non-live latest deploy', async () => {
    let requestNumber = 0

    const reader = createRenderReader({
      token: 'token',
      fetchImpl: async () => {
        requestNumber += 1

        return requestNumber === 1
          ? jsonResponse(healthyService)
          : jsonResponse([
              {
                ...liveDeploy,
                status: 'build_in_progress',
              },
            ])
      },
    })

    const result = await reader(registration)

    expect(result.deployment).toBe('attention')
  })

  it('reports attention for a suspended service', async () => {
    let requestNumber = 0

    const reader = createRenderReader({
      token: 'token',
      fetchImpl: async () => {
        requestNumber += 1

        return requestNumber === 1
          ? jsonResponse({
              ...healthyService,
              suspended: 'suspended',
            })
          : jsonResponse([liveDeploy])
      },
    })

    const result = await reader(registration)

    expect(result.deployment).toBe('attention')
  })

  it.each([
    ['service id', { id: 'srv-other' }],
    ['service name', { name: 'other-service' }],
    ['branch', { branch: 'main' }],
    [
      'region',
      {
        serviceDetails: {
          region: 'oregon',
        },
      },
    ],
  ])(
    'reports attention when %s differs from registration',
    async (_label, override) => {
      let requestNumber = 0

      const reader = createRenderReader({
        token: 'token',
        fetchImpl: async () => {
          requestNumber += 1

          return requestNumber === 1
            ? jsonResponse({
                ...healthyService,
                ...override,
              })
            : jsonResponse([liveDeploy])
        },
      })

      const result = await reader(registration)

      expect(result.deployment).toBe('attention')
    },
  )

  it.each([
    ['empty deploy list', []],
    ['non-array deploy payload', {}],
    ['non-object deploy entry', [null]],
    ['malformed direct deploy', [{}]],
    [
      'malformed wrapped deploy',
      [
        {
          deploy: {
            id: 'dep-test',
            status: 'live',
          },
        },
      ],
    ],
  ])(
    'degrades %s to unknown',
    async (_label, deployPayload) => {
      let requestNumber = 0

      const reader = createRenderReader({
        token: 'token',
        fetchImpl: async () => {
          requestNumber += 1

          return requestNumber === 1
            ? jsonResponse(healthyService)
            : jsonResponse(deployPayload)
        },
      })

      const result = await reader(registration)

      expect(result.deployId).toBeNull()
      expect(result.commitId).toBeNull()
      expect(result.deployment).toBe('unknown')
    },
  )

  it('keeps known service attention when deploy payload is malformed', async () => {
    let requestNumber = 0

    const reader = createRenderReader({
      token: 'token',
      fetchImpl: async () => {
        requestNumber += 1

        return requestNumber === 1
          ? jsonResponse({
              ...healthyService,
              suspended: 'suspended',
            })
          : jsonResponse([])
      },
    })

    const result = await reader(registration)

    expect(result.deployId).toBeNull()
    expect(result.commitId).toBeNull()
    expect(result.deployment).toBe('attention')
  })

  it('keeps known service attention when deploy read fails', async () => {
    let requestNumber = 0

    const reader = createRenderReader({
      token: 'token',
      fetchImpl: async () => {
        requestNumber += 1

        return requestNumber === 1
          ? jsonResponse({
              ...healthyService,
              suspended: 'suspended',
            })
          : jsonResponse(
              { message: 'unavailable' },
              503,
            )
      },
    })

    const result = await reader(registration)

    expect(result.deployment).toBe('attention')
  })

  it('degrades a healthy service to unknown when deploy read fails', async () => {
    let requestNumber = 0

    const reader = createRenderReader({
      token: 'token',
      fetchImpl: async () => {
        requestNumber += 1

        return requestNumber === 1
          ? jsonResponse(healthyService)
          : jsonResponse(
              { message: 'rate limited' },
              429,
            )
      },
    })

    const result = await reader(registration)

    expect(result.deployment).toBe('unknown')
  })

  it.each([
    ['service request failure', jsonResponse({}, 404)],
    ['non-object service', jsonResponse(null)],
    ['missing service fields', jsonResponse({})],
    [
      'missing region',
      jsonResponse({
        id: registration.serviceId,
        name: registration.serviceName,
        branch: registration.branch,
        suspended: 'not_suspended',
        serviceDetails: {},
      }),
    ],
  ])(
    'fails closed for %s',
    async (_label, serviceResponse) => {
      let requests = 0

      const reader = createRenderReader({
        token: 'token',
        fetchImpl: async () => {
          requests += 1
          return serviceResponse
        },
      })

      await expect(reader(registration)).resolves.toEqual({
        serviceId: registration.serviceId,
        serviceName: registration.serviceName,
        branch: registration.branch,
        region: registration.region,
        deployId: null,
        commitId: null,
        deployment: 'unknown',
      })

      expect(requests).toBe(1)
    },
  )

  it('fails closed for a network error', async () => {
    const reader = createRenderReader({
      token: 'token',
      fetchImpl: async () => {
        throw new Error('network unavailable')
      },
    })

    const result = await reader(registration)

    expect(result.deployment).toBe('unknown')
  })

  it.each([
    [
      'bad service id',
      {
        ...registration,
        serviceId: 'bad-service',
      },
    ],
    [
      'empty service id suffix',
      {
        ...registration,
        serviceId: 'srv-',
      },
    ],
    [
      'empty service name',
      {
        ...registration,
        serviceName: '   ',
      },
    ],
    [
      'empty branch',
      {
        ...registration,
        branch: '   ',
      },
    ],
    [
      'empty region',
      {
        ...registration,
        region: '   ',
      },
    ],
  ])(
    'returns unknown without a request for %s',
    async (_label, invalidRegistration) => {
      let called = false

      const reader = createRenderReader({
        token: 'token',
        fetchImpl: async () => {
          called = true
          return jsonResponse({})
        },
      })

      const result = await reader(invalidRegistration)

      expect(result.deployment).toBe('unknown')
      expect(called).toBe(false)
    },
  )

  it.each([
    ['missing token', undefined],
    ['blank token', '   '],
  ])(
    'returns unknown without a request for %s',
    async (_label, token) => {
      let called = false

      const reader = createRenderReader({
        token,
        fetchImpl: async () => {
          called = true
          return jsonResponse({})
        },
      })

      const result = await reader(registration)

      expect(result.deployment).toBe('unknown')
      expect(called).toBe(false)
    },
  )
  it('caches a Render snapshot within TTL and refreshes after expiry', async () => {
    let requests = 0
    let clock = 1_000

    const reader = createRenderReader({
      token: 'token',
      cacheTtlMs: 60_000,
      now: () => clock,
      fetchImpl: async () => {
        requests += 1

        return requests % 2 === 1
          ? jsonResponse(healthyService)
          : jsonResponse([liveDeploy])
      },
    })

    const first = await reader(registration)
    const second = await reader(registration)

    expect(second).toEqual(first)
    expect(requests).toBe(2)

    clock += 60_001

    const refreshed = await reader(registration)

    expect(refreshed).toEqual(first)
    expect(requests).toBe(4)
  })

  it('deduplicates concurrent reads for the same Render registration', async () => {
    let requests = 0
    let releaseFirst!: () => void

    const firstRequestGate = new Promise<void>(
      (resolve) => {
        releaseFirst = resolve
      },
    )

    const reader = createRenderReader({
      token: 'token',
      fetchImpl: async () => {
        requests += 1

        if (requests === 1) {
          await firstRequestGate
          return jsonResponse(healthyService)
        }

        return jsonResponse([liveDeploy])
      },
    })

    const first = reader(registration)
    const second = reader(registration)

    await Promise.resolve()

    expect(requests).toBe(1)

    releaseFirst()

    const [firstResult, secondResult] =
      await Promise.all([first, second])

    expect(requests).toBe(2)
    expect(secondResult).toEqual(firstResult)
    expect(firstResult.deployment).toBe('healthy')
  })

})
