import {
  projectRegistryResponseSchema,
  type ProjectRegistryResponse,
} from '@orbis-admin/contracts'
import type { FastifyInstance } from 'fastify'
import { readProjectRegistry } from '../registry/projects.js'

export const registerProjectRoutes = (app: FastifyInstance) => {
  app.get<{ Reply: ProjectRegistryResponse }>(
    '/api/v1/projects',
    {
      schema: {
        response: {
          200: projectRegistryResponseSchema,
        },
      },
    },
    async () => readProjectRegistry(),
  )
}
