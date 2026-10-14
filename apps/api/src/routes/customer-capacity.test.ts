import Fastify from 'fastify'
import { expect, it, vi } from 'vitest'
import { registerCustomerRoutes } from './customer'
import { createCustomerService } from '../customer/service'
it('rejects new client windows at capacity while continuing to enforce existing client windows', async () => {
  const app = Fastify(), now = vi.spyOn(Date, 'now').mockReturnValue(1000)
  try {
    registerCustomerRoutes(app, createCustomerService({}))
    for (let start = 0; start < 10000; start += 20) {
      const results = await Promise.all(Array.from({ length: 20 }, (_, offset) => app.inject({ url: '/api/v1/customer/config', remoteAddress: `10.0.${Math.floor((start + offset) / 256)}.${(start + offset) % 256}` })))
      expect(results.every(response => response.statusCode === 200)).toBe(true)
    }
    expect((await app.inject({ url: '/api/v1/customer/config', remoteAddress: '10.1.0.1' })).statusCode).toBe(429)
    expect((await app.inject({ url: '/api/v1/customer/config', remoteAddress: '10.0.0.0' })).statusCode).toBe(200)
    now.mockReturnValue(61000)
    expect((await app.inject({ url: '/api/v1/customer/config', remoteAddress: '10.1.0.1' })).statusCode).toBe(200)
  } finally { now.mockRestore(); await app.close() }
}, 120000)
