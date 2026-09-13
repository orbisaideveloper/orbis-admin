export type HealthResponse = {
  status: 'ok'
  service: 'orbis-admin-api'
  revision: string | null
}

export const buildHealthResponse = (
  revision: string | undefined,
): HealthResponse => ({
  status: 'ok',
  service: 'orbis-admin-api',
  revision: revision ?? null,
})

export const healthResponse = buildHealthResponse(undefined)
