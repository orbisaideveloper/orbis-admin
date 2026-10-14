import type { FastifyInstance } from 'fastify'
import { createCustomerService, CustomerError } from '../customer/service.js'
import { directoryCursor, requireCustomerDirectory } from '../customer/directory.js'
import { createOwnerVerifier, OwnerAccessError, type OwnerBinding } from '../security/owner.js'
function bindings(): OwnerBinding[] {
  try {
    const value: unknown = JSON.parse(process.env.ORBIS_ADMIN_OWNER_BINDINGS ?? '[]')
    if (!Array.isArray(value) || !value.every((item: unknown) => item && typeof item === 'object' && 'authUserId' in item && typeof item.authUserId === 'string' && 'orbisIdentityId' in item && typeof item.orbisIdentityId === 'string' && 'capabilities' in item && Array.isArray(item.capabilities) && item.capabilities.every((cap: unknown) => typeof cap === 'string'))) return []
    return value as OwnerBinding[]
  } catch { return [] }
}
export function registerCustomerDirectory(app: FastifyInstance,
  verify = createOwnerVerifier({ origin: process.env.ORBIS_ADMIN_SUPABASE_URL ?? '', publishableKey: process.env.ORBIS_ADMIN_SUPABASE_PUBLISHABLE_KEY ?? '', bindings: bindings() }),
  service = createCustomerService({ enabled: process.env.ORBIS_CUSTOMER_AUTH === 'enabled', origin: process.env.ORBIS_CUSTOMER_SUPABASE_URL, publicKey: process.env.ORBIS_CUSTOMER_PUBLISHABLE_KEY, serviceKey: process.env.ORBIS_CUSTOMER_SERVICE_KEY })) {
  app.get<{ Querystring: { after?: string } }>('/api/v1/admin/customers', async (request, reply) => {
    reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff')
    try {
      const owner = await verify(request.headers.authorization)
      requireCustomerDirectory(owner)
      if (Object.keys(request.query).some(key => key !== 'after')) throw new CustomerError(400, 'CUSTOMER_DIRECTORY_INPUT_INVALID')
      return await service.directory(owner, directoryCursor(request.query.after))
    } catch (error) {
      if (error instanceof CustomerError || error instanceof OwnerAccessError) return reply.code(error.status).send({ error: error.code })
      return reply.code(503).send({ error: 'CUSTOMER_DIRECTORY_UNAVAILABLE' })
    }
  })
}
