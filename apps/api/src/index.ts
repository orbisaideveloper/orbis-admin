import fastifyStatic from '@fastify/static'
import Fastify, { type FastifyInstance } from 'fastify'
import { resolve } from 'node:path'
import {
  buildHealthResponse,
  type HealthResponse,
} from '@orbis-admin/contracts'
import {
  registerProjectRoutes,
  type ProjectRegistryReader,
} from './routes/projects.js'

export type BuildAppOptions = {
  webRoot?: string
  projectRegistryReader?: ProjectRegistryReader
}

export const resolveDefaultWebRoot = (
  cwd: string = process.cwd(),
) => {
  const normalized = cwd.replaceAll('\\', '/')

  if (normalized.endsWith('/apps/api')) {
    return resolve(cwd, '../web/dist')
  }

  return resolve(cwd, 'apps/web/dist')
}

const shouldKeepNotFound = (pathname: string) =>
  pathname.startsWith('/api/') ||
  pathname === '/health' ||
  pathname.startsWith('/health/') ||
  pathname.startsWith('/assets/') ||
  pathname.includes('.')

const registerWebRuntime = (
  app: FastifyInstance,
  webRoot: string,
) => {
  app.register(fastifyStatic, {
    root: webRoot,
    wildcard: false,
  })

  app.setNotFoundHandler((request, reply) => {
    const pathname = request.url.split('?')[0]

    if (shouldKeepNotFound(pathname)) {
      return reply.code(404).send({
        error: 'Not Found',
      })
    }

    return reply
      .type('text/html; charset=utf-8')
      .sendFile('index.html', {
        immutable: false,
        maxAge: 0,
      })
  })
}

export function buildApp(
  options: BuildAppOptions = {},
): FastifyInstance {
  const app = Fastify({
    logger: false,
  })

  app.get<{ Reply: HealthResponse }>(
    '/health',
    async () =>
      buildHealthResponse(
        process.env.RENDER_GIT_COMMIT,
      ),
  )

  registerProjectRoutes(
    app,
    options.projectRegistryReader,
  )

  if (options.webRoot) {
    registerWebRuntime(app, options.webRoot)
  }

  return app
}

export async function startServer(
  port: number,
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = buildApp(options)

  await app.listen({
    host: '0.0.0.0',
    port,
  })

  return app
}

export {
  createIdentityDisplayId,
  createUuidV7,
} from './identity/identifiers.js'

export {
  normalizeEmail,
  normalizePhone,
  observationIdentifiers,
  resolveIdentityObservation,
} from './identity/resolution.js'
