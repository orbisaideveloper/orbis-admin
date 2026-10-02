import type { FastifyInstance } from 'fastify'
import { createMayaWorkspaceReader } from '../providers/maya.js'

export const registerMayaWorkspaceRoute = (
  app: FastifyInstance,
  reader = createMayaWorkspaceReader({
    token: process.env.ORBIS_GITHUB_TOKEN,
    publicUrl: process.env.ORBIS_MAYA_PUBLIC_URL,
    developmentUrl: process.env.ORBIS_MAYA_DEVELOPMENT_URL,
  }),
) => {
  app.get('/api/v1/projects/orbis-maya/workspace', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store')
    return reader()
  })
}
