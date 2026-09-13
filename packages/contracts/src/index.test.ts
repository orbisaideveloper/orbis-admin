import { describe, expect, it } from 'vitest'
import {
  buildHealthResponse,
  healthResponse,
} from './index'

describe('ORBIS Admin shared contracts', () => {
  it('defines the canonical API health response', () => {
    expect(healthResponse).toEqual({
      status: 'ok',
      service: 'orbis-admin-api',
      revision: null,
    })
  })

  it('includes an exact runtime revision when supplied', () => {
    expect(
      buildHealthResponse(
        '0123456789abcdef0123456789abcdef01234567',
      ),
    ).toEqual({
      status: 'ok',
      service: 'orbis-admin-api',
      revision:
        '0123456789abcdef0123456789abcdef01234567',
    })
  })
})
