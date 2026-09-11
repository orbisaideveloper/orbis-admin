import { describe, expect, it } from 'vitest'
import { healthResponse } from './index'

describe('ORBIS Admin shared contracts', () => {
  it('defines the canonical API health response', () => {
    expect(healthResponse).toEqual({
      status: 'ok',
      service: 'orbis-admin-api',
    })
  })
})
