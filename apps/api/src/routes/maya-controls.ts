import type { FastifyInstance } from 'fastify'
import { createOwnerVerifier, OwnerAccessError, type OwnerBinding } from '../security/owner.js'
import { createMayaControl } from '../security/maya-control.js'
import { createControlProviders } from '../security/control-provider.js'
import { publicOwnerAuthConfig } from '../security/auth-config.js'
import { createOwnerRateLimit } from '../security/control-rate.js'

const bindingsFromEnvironment = (): OwnerBinding[] => {
  try {
    const value: unknown = JSON.parse(process.env.ORBIS_ADMIN_OWNER_BINDINGS ?? '[]')
    if (!Array.isArray(value) || !value.every((entry) => entry &&
      typeof entry.authUserId === 'string' && typeof entry.orbisIdentityId === 'string' &&
      Array.isArray(entry.capabilities) && entry.capabilities.every((item: unknown) => typeof item === 'string'))) return []
    return value
  } catch { return [] }
}

export const registerMayaControls = (
  app: FastifyInstance,
  verify = createOwnerVerifier({ origin: process.env.ORBIS_ADMIN_SUPABASE_URL ?? '',
    publishableKey: process.env.ORBIS_ADMIN_SUPABASE_PUBLISHABLE_KEY ?? '',
    bindings: bindingsFromEnvironment() }),
  control = createMayaControl({
    ...createControlProviders({ supabaseOrigin: process.env.ORBIS_ADMIN_SUPABASE_URL ?? '',
      serviceKey: process.env.ORBIS_ADMIN_SUPABASE_SERVICE_KEY ?? '',
      githubToken: process.env.ORBIS_GITHUB_TOKEN,
      renderToken: process.env.ORBIS_RENDER_TOKEN ?? '' }),
    switches: () => [process.env.ORBIS_ADMIN_WRITES, process.env.ORBIS_ADMIN_DEPLOY_WRITES,
      process.env.ORBIS_ADMIN_RENDER_WRITES, process.env.ORBIS_ADMIN_MAYA_WRITES],
  }),
) => {
  app.get('/api/v1/admin/auth-config', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store')
    return publicOwnerAuthConfig()
  })
  app.register(async (secured) => {
    const rateLimit = createOwnerRateLimit()
    secured.setErrorHandler((error, _request, reply) => {
      if (error instanceof OwnerAccessError) return reply.code(error.status).send({ error: error.code })
      if (error && typeof error === 'object' && 'validation' in error) {
        return reply.code(400).send({ error: 'INVALID_CONTROL_INPUT' })
      }
      return reply.code(503).send({ error: 'ADMIN_CONTROL_UNAVAILABLE' })
    })
    secured.addHook('onRequest', async (request, reply) => {
      reply.header('Cache-Control', 'no-store')
      rateLimit(request.ip)
    })
    secured.get('/api/v1/admin/session', async (request) => {
      const owner = await verify(request.headers.authorization)
      return { orbisIdentityId: owner.orbisIdentityId, capabilities: owner.capabilities }
    })
    secured.get('/api/v1/projects/orbis-maya/audit', async (request) =>
      control.audit(await verify(request.headers.authorization)))
    secured.post<{ Body: { revision: string } }>('/api/v1/projects/orbis-maya/deploy/prepare', {
      schema: { body: { type: 'object', additionalProperties: false,
        required: ['revision'], properties: { revision: { type: 'string', pattern: '^[0-9a-f]{40}$' } } } },
    }, async (request) => control.prepare(await verify(request.headers.authorization), request.body.revision))
    secured.post<{ Body: { confirmation: string } }>('/api/v1/projects/orbis-maya/deploy/execute', {
      schema: { body: { type: 'object', additionalProperties: false,
        required: ['confirmation'], properties: { confirmation: { type: 'string', pattern: '^[0-9a-f]{64}$' } } } },
    }, async (request) => control.execute(await verify(request.headers.authorization), request.body.confirmation))
  })
}
