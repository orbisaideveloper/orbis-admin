import type {
  RenderRegistration,
  SignalState,
} from '@orbis-admin/contracts'

type RenderFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>

type RenderReaderOptions = {
  fetchImpl?: RenderFetch
  token?: string
  apiBaseUrl?: string
  cacheTtlMs?: number
  now?: () => number
}

export type RenderReadState = {
  serviceId: string
  serviceName: string
  branch: string
  region: string
  deployId: string | null
  commitId: string | null
  deployment: SignalState
}

type RenderServiceSnapshot = {
  id: string
  name: string
  branch: string
  region: string
  suspended: string
}

type RenderDeploySnapshot = {
  id: string
  status: string
  commitId: string
}

const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)

const serviceRegion = (
  payload: Record<string, unknown>,
): string | null => {
  if (typeof payload.region === 'string') {
    return payload.region
  }

  if (
    isRecord(payload.serviceDetails) &&
    typeof payload.serviceDetails.region === 'string'
  ) {
    return payload.serviceDetails.region
  }

  return null
}

const serviceFromPayload = (
  payload: unknown,
): RenderServiceSnapshot | null => {
  if (!isRecord(payload)) {
    return null
  }

  const region = serviceRegion(payload)

  if (
    typeof payload.id !== 'string' ||
    typeof payload.name !== 'string' ||
    typeof payload.branch !== 'string' ||
    typeof payload.suspended !== 'string' ||
    region === null
  ) {
    return null
  }

  return {
    id: payload.id,
    name: payload.name,
    branch: payload.branch,
    region,
    suspended: payload.suspended,
  }
}

const deployFromPayload = (
  payload: unknown,
): RenderDeploySnapshot | null => {
  if (!Array.isArray(payload) || payload.length === 0) {
    return null
  }

  const first = payload[0]
  if (!isRecord(first)) {
    return null
  }

  const candidate =
    'deploy' in first ? first.deploy : first

  if (
    !isRecord(candidate) ||
    typeof candidate.id !== 'string' ||
    typeof candidate.status !== 'string' ||
    !isRecord(candidate.commit) ||
    typeof candidate.commit.id !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    status: candidate.status,
    commitId: candidate.commit.id,
  }
}

const fallbackState = (
  registration: RenderRegistration,
): RenderReadState => ({
  serviceId: registration.serviceId,
  serviceName: registration.serviceName,
  branch: registration.branch,
  region: registration.region,
  deployId: null,
  commitId: null,
  deployment: 'unknown',
})

const validRegistration = (
  registration: RenderRegistration,
) =>
  registration.serviceId.startsWith('srv-') &&
  registration.serviceId.length > 4 &&
  [
    registration.serviceName,
    registration.branch,
    registration.region,
  ].every((value) => value.trim().length > 0)

const serviceNeedsAttention = (
  registration: RenderRegistration,
  service: RenderServiceSnapshot,
) =>
  service.id !== registration.serviceId ||
  service.name !== registration.serviceName ||
  service.branch !== registration.branch ||
  service.region !== registration.region ||
  service.suspended !== 'not_suspended'

const renderCacheKey = (
  registration: RenderRegistration,
) =>
  [
    registration.serviceId,
    registration.serviceName,
    registration.branch,
    registration.region,
  ].join('\u0000')

export const createRenderReader = ({
  fetchImpl = fetch,
  token,
  apiBaseUrl = 'https://api.render.com',
  cacheTtlMs = 60_000,
  now = Date.now,
}: RenderReaderOptions = {}) => {
  let baseUrl = apiBaseUrl
  while (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }

  const normalizedToken =
    typeof token === 'string' ? token.trim() : ''

  const cache = new Map<
    string,
    {
      expiresAt: number
      value: RenderReadState
    }
  >()

  const inFlight = new Map<
    string,
    Promise<RenderReadState>
  >()

  const readFresh = async (
    registration: RenderRegistration,
    fallback: RenderReadState,
  ): Promise<RenderReadState> => {
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${normalizedToken}`,
    }

    try {
      const serviceResponse = await fetchImpl(
        `${baseUrl}/v1/services/${encodeURIComponent(registration.serviceId)}`,
        { headers },
      )

      if (!serviceResponse.ok) {
        return fallback
      }

      const service = serviceFromPayload(
        await serviceResponse.json(),
      )

      if (!service) {
        return fallback
      }

      const serviceAttention = serviceNeedsAttention(
        registration,
        service,
      )

      const deployResponse = await fetchImpl(
        `${baseUrl}/v1/services/${encodeURIComponent(registration.serviceId)}/deploys?limit=1`,
        { headers },
      )

      if (!deployResponse.ok) {
        return {
          ...fallback,
          deployment: serviceAttention
            ? 'attention'
            : 'unknown',
        }
      }

      const deploy = deployFromPayload(
        await deployResponse.json(),
      )

      if (!deploy) {
        return {
          ...fallback,
          deployment: serviceAttention
            ? 'attention'
            : 'unknown',
        }
      }

      return {
        serviceId: registration.serviceId,
        serviceName: registration.serviceName,
        branch: registration.branch,
        region: registration.region,
        deployId: deploy.id,
        commitId: deploy.commitId,
        deployment:
          serviceAttention || deploy.status !== 'live'
            ? 'attention'
            : 'healthy',
      }
    } catch {
      return fallback
    }
  }

  return async (
    registration: RenderRegistration,
  ): Promise<RenderReadState> => {
    const fallback = fallbackState(registration)

    if (
      !validRegistration(registration) ||
      normalizedToken.length === 0
    ) {
      return fallback
    }

    const key = renderCacheKey(registration)
    const cached = cache.get(key)

    if (cached && cached.expiresAt > now()) {
      return cached.value
    }

    const pending = inFlight.get(key)

    if (pending) {
      return pending
    }

    const request = readFresh(registration, fallback)
    inFlight.set(key, request)

    try {
      const value = await request

      cache.set(key, {
        expiresAt: now() + cacheTtlMs,
        value,
      })

      return value
    } finally {
      inFlight.delete(key)
    }
  }
}
