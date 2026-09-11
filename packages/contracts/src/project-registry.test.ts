import { describe, expect, it } from 'vitest'
import {
  environmentKindValues,
  projectLifecycleValues,
  projectRegistryResponseSchema,
  signalStateValues,
} from './project-registry'

describe('project registry contract', () => {
  it('locks the provider-neutral lifecycle, environment and signal vocabularies', () => {
    expect(projectLifecycleValues).toEqual([
      'active',
      'external',
      'planned',
    ])
    expect(environmentKindValues).toEqual([
      'development',
      'staging',
      'production',
      'external',
      'planned',
    ])
    expect(signalStateValues).toEqual([
      'healthy',
      'attention',
      'planned',
      'unknown',
    ])
  })

  it('publishes a strict v1 registry response schema', () => {
    expect(projectRegistryResponseSchema.$id).toBe('ProjectRegistryResponseV1')
    expect(projectRegistryResponseSchema.additionalProperties).toBe(false)
    expect(projectRegistryResponseSchema.properties.schemaVersion.const).toBe('v1')
    expect(projectRegistryResponseSchema.properties.projects.type).toBe('array')
    expect(
      projectRegistryResponseSchema.properties.projects.items.properties.signals
        .properties.quality.enum,
    ).toBe(signalStateValues)
  })
})
