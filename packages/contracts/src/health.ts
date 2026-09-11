export const healthResponse = {
  status: 'ok',
  service: 'orbis-admin-api',
} as const

export type HealthResponse = typeof healthResponse
