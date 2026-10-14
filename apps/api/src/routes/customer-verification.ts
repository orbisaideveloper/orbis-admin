import { timingSafeEqual } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { createCustomerService, CustomerError } from '../customer/service.js'

export function registerCustomerVerification(app: FastifyInstance, options: {
  key?: string; current?: (token: string) => Promise<unknown>
} = {}) {
  const key = options.key ?? process.env.ORBIS_CUSTOMER_VERIFY_KEY ?? ''
  const current = options.current ?? createCustomerService({ enabled: process.env.ORBIS_CUSTOMER_AUTH === 'enabled',
    origin: process.env.ORBIS_CUSTOMER_SUPABASE_URL, publicKey: process.env.ORBIS_CUSTOMER_PUBLISHABLE_KEY,
    serviceKey: process.env.ORBIS_CUSTOMER_SERVICE_KEY }).current
  app.get('/api/v1/service/customer/session', async (request, reply) => {
    reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff')
    const supplied = request.headers['x-orbis-verification-key']
    if (request.headers.origin || key.length < 32 || typeof supplied !== 'string' || supplied.length > 256 ||
      Buffer.byteLength(supplied) !== Buffer.byteLength(key) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(key))) {
      return reply.code(403).send({ error: 'CUSTOMER_SERVICE_DENIED' })
    }
    const token = /^Bearer ([A-Za-z0-9._~-]{1,8192})$/u.exec(request.headers.authorization ?? '')?.[1]
    if (!token) return reply.code(401).send({ error: 'CUSTOMER_LOGIN_REQUIRED' })
    try { return await current(token) }
    catch (error) { return reply.code(error instanceof CustomerError ? error.status : 503)
      .send({ error: error instanceof CustomerError ? error.code : 'CUSTOMER_SERVICE_UNAVAILABLE' }) }
  })
}
