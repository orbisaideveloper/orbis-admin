import Fastify, { type FastifyInstance } from 'fastify'
import {
  healthResponse,
  type HealthResponse,
} from '@orbis-admin/contracts'

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
  })

  app.get<{ Reply: HealthResponse }>(
    '/health',
    async () => healthResponse,
  )

  return app
}

export async function startServer(
  port: number,
): Promise<FastifyInstance> {
  const app = buildApp()

  await app.listen({
    host: '0.0.0.0',
    port,
  })

  return app
}
