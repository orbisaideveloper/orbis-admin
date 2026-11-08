import type { FastifyInstance } from 'fastify'

/** Minimal service reachability traces. No personal data, raw paths or bodies. */
export function installRuntimeDiagnostics(
  app: FastifyInstance,
  sink: Pick<Console, 'info' | 'warn'> = console,
): void {
  let firstRequestSeen = false
  let firstHealthSeen = false

  app.addHook('onRequest', (request, _reply, done) => {
    if (!firstRequestSeen) {
      firstRequestSeen = true
      sink.info('[orbis-admin-runtime] first_http_request_received')
    }
    if (!firstHealthSeen && request.method === 'GET' && request.url.split('?')[0] === '/health') {
      firstHealthSeen = true
      sink.info('[orbis-admin-runtime] first_health_request_received')
    }
    done()
  })

  // Successful login requests emit no diagnostic record.
  app.addHook('onResponse', (request, reply, done) => {
    if (request.method === 'POST' && request.url.split('?')[0] === '/api/v1/customer/login' && reply.statusCode >= 400) {
      sink.warn('[orbis-admin-runtime] login_http_failure', reply.statusCode)
    }
    done()
  })
}
