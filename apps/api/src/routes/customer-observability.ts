import type { FastifyInstance } from 'fastify'
import { createOwnerVerifier, OwnerAccessError } from '../security/owner.js'
import { requireCustomerDirectory } from '../customer/directory.js'
import { CustomerError } from '../customer/error.js'
import { createCustomerObservability, observationFilter } from '../customer/observability.js'
import { customerOwnerBindings } from './customer-directory.js'
export function registerCustomerObservability(app: FastifyInstance,
  verify = createOwnerVerifier({ origin: process.env.ORBIS_ADMIN_SUPABASE_URL ?? '', publishableKey: process.env.ORBIS_ADMIN_SUPABASE_PUBLISHABLE_KEY ?? '', bindings: customerOwnerBindings() }),
  read = createCustomerObservability({ enabled: process.env.ORBIS_CUSTOMER_OBSERVABILITY === 'enabled', origin: process.env.ORBIS_CUSTOMER_SUPABASE_URL, serviceKey: process.env.ORBIS_CUSTOMER_SERVICE_KEY })) {
  app.get<{ Querystring: Record<string, unknown> }>('/api/v1/admin/customer-observability', async (request, reply) => {
    reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff')
    try {
      const owner = await verify(request.headers.authorization)
      requireCustomerDirectory(owner)
      return await read(owner, observationFilter(request.query))
    } catch (error) {
      if (error instanceof CustomerError || error instanceof OwnerAccessError) return reply.code(error.status).send({ error: error.code })
      return reply.code(503).send({ error: 'OBSERVABILITY_UNAVAILABLE' })
    }
  })
}
