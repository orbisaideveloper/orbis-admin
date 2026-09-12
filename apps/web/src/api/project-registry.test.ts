import { describe, expect, it, vi } from 'vitest'
import {
  loadProjectRegistry,
  parseProjectRegistryResponse,
} from './project-registry'
import { projectRegistryFixture } from '../test/project-registry-fixture'

const response = (
  body: unknown,
  ok = true,
  status = 200,
): Response => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(body),
} as unknown as Response)

describe('project registry web API boundary', () => {
  it('accepts the v1 registry envelope', () => {
    expect(parseProjectRegistryResponse(projectRegistryFixture)).toBe(
      projectRegistryFixture,
    )
  })

  it('rejects primitive and null envelopes', () => {
    expect(() => parseProjectRegistryResponse('bad')).toThrow(
      'expected object',
    )
    expect(() => parseProjectRegistryResponse(null)).toThrow(
      'expected object',
    )
  })

  it('rejects incompatible schema versions', () => {
    expect(() =>
      parseProjectRegistryResponse({
        ...projectRegistryFixture,
        schemaVersion: 'v2',
      }),
    ).toThrow('schemaVersion')
  })

  it('rejects missing generatedAt values', () => {
    expect(() =>
      parseProjectRegistryResponse({
        schemaVersion: 'v1',
        projects: [],
      }),
    ).toThrow('generatedAt')
  })

  it('rejects non-array project collections', () => {
    expect(() =>
      parseProjectRegistryResponse({
        schemaVersion: 'v1',
        generatedAt: projectRegistryFixture.generatedAt,
        projects: {},
      }),
    ).toThrow('projects')
  })

  it('loads the same-origin registry with an explicit JSON accept header', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      response(projectRegistryFixture),
    )

    await expect(loadProjectRegistry(fetcher)).resolves.toEqual(
      projectRegistryFixture,
    )
    expect(fetcher).toHaveBeenCalledWith('/api/v1/projects', {
      headers: {
        accept: 'application/json',
      },
    })
  })

  it('surfaces non-successful HTTP responses', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      response({}, false, 503),
    )

    await expect(loadProjectRegistry(fetcher)).rejects.toThrow(
      'Project registry request failed: 503',
    )
  })
})
