import { createMayaProfiles } from '../customer/maya-profiles.js'
import type { FastifyInstance } from 'fastify'
import { createCustomerRecovery } from '../customer/recovery.js'
import { createCustomerService, CustomerError } from '../customer/service.js'

type Service = ReturnType<typeof createCustomerService>
export function registerCustomerRoutes(app: FastifyInstance, service: Service = createCustomerService({
  enabled: process.env.ORBIS_CUSTOMER_AUTH === 'enabled',
  origin: process.env.ORBIS_CUSTOMER_SUPABASE_URL,
  publicKey: process.env.ORBIS_CUSTOMER_PUBLISHABLE_KEY,
  serviceKey: process.env.ORBIS_CUSTOMER_SERVICE_KEY,
}), allowedOrigins: readonly string[] = (process.env.ORBIS_CUSTOMER_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean), recovery = createCustomerRecovery({
  enabled: process.env.ORBIS_CUSTOMER_AUTH === 'enabled', origin: process.env.ORBIS_CUSTOMER_SUPABASE_URL,
  publicKey: process.env.ORBIS_CUSTOMER_PUBLISHABLE_KEY, serviceKey: process.env.ORBIS_CUSTOMER_SERVICE_KEY,
}), mayaProfiles = createMayaProfiles(service, { serviceKey: process.env.ORBIS_CUSTOMER_SERVICE_KEY })) {
  // This is a customer boundary. It never invokes owner/deployment capabilities.
  app.register((scope, _options, done) => {
    const windows = new Map<string, { start: number; count: number }>()
    scope.addHook('onRequest', async (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff')
      const origin = request.headers.origin
      if (origin) {
        if (!allowedOrigins.includes(origin)) return reply.code(403).send({ error: 'CUSTOMER_ORIGIN_DENIED' })
        reply.header('Access-Control-Allow-Origin', origin).header('Vary', 'Origin')
      }
      const now = Date.now()
      for (const [key, value] of windows) if (now - value.start >= 60_000) windows.delete(key)
      const key = request.ip
      const window = windows.get(key) ?? { start: now, count: 0 }
      if (!windows.has(key) && windows.size >= 10000) return reply.code(429).send({ error: 'CUSTOMER_RATE_LIMITED' })
      window.count++; windows.set(key, window)
      if (window.count > 30) return reply.code(429).send({ error: 'CUSTOMER_RATE_LIMITED' })
    })
    scope.setErrorHandler((error, _request, reply) => {
      const status = error instanceof CustomerError ? error.status : 503
      const code = error instanceof CustomerError ? error.code : 'CUSTOMER_SERVICE_UNAVAILABLE'
      void reply.code(status).send({ error: code })
    })
    const token = (authorization: string | undefined) => {
      if (!authorization?.startsWith('Bearer ')) throw new CustomerError(401, 'CUSTOMER_LOGIN_REQUIRED')
      return authorization.slice(7)
    }
    scope.get('/config', (_request, reply) => reply.send({ available: service.available() }))
    scope.options('/*', (_request, reply) => reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .header('Access-Control-Allow-Headers', 'Authorization, Content-Type').code(204).send())
    scope.post('/recover', { bodyLimit: 4096 }, async request => recovery.recover(request.body, allowedOrigins))
    scope.post('/recovery', { bodyLimit: 4096 }, async request => recovery.verify(request.body))
    scope.post('/password', { bodyLimit: 4096 }, async request => recovery.password(token(request.headers.authorization), request.body))
    scope.post('/signup', { bodyLimit: 4096 }, async request => service.authenticate(request.body, true))
    scope.post('/login', { bodyLimit: 4096 }, async request => service.authenticate(request.body, false))
    scope.post('/refresh', { bodyLimit: 16384 }, async request => service.refresh(request.body))
    scope.get<{ Params: { project: string; environment: string } }>('/session/products/:project/:environment', async request =>
      service.product(token(request.headers.authorization), request.params.project, request.params.environment))
    scope.get('/maya/profiles', async request => mayaProfiles(token(request.headers.authorization)))
    scope.post('/maya/profiles', { bodyLimit: 8192 }, async request => mayaProfiles(token(request.headers.authorization), request.body))
    scope.get('/profile', async request => service.profile(token(request.headers.authorization)))
    scope.post('/profile', { bodyLimit: 8192 }, async request => service.profile(token(request.headers.authorization), request.body))
    scope.get('/session', async request => service.current(token(request.headers.authorization)))
    scope.post('/logout', async request => service.logout(token(request.headers.authorization)))
    done()
  }, { prefix: '/api/v1/customer' })
}
