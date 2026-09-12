import { describe, expect, it } from 'vitest'
import {
  readProjectRegistry,
  registeredProjects,
} from './projects'

describe('canonical project registry', () => {
  it('keeps registration metadata separate from future live provider signals', () => {
    expect(registeredProjects).toHaveLength(3)

    const admin = registeredProjects[0]
    expect(admin.id).toBe('orbis-admin')
    expect(admin.providers.github.repositoryFullName).toBe(
      'orbisaideveloper/orbis-admin',
    )
    expect(admin.providers.render.serviceName).toBe('orbis-admin-staging')
    expect(admin.providers.sonar.projectKey).toBe(
      'orbisaideveloper_orbis-admin',
    )
    expect(admin.signals).toEqual({
      ci: 'unknown',
      quality: 'unknown',
      deployment: 'unknown',
      health: 'unknown',
    })

    expect(registeredProjects[1].lifecycle).toBe('external')
    expect(registeredProjects[2].lifecycle).toBe('planned')
    expect(registeredProjects[2].repository).toBeNull()
  })

  it('returns a deterministic v1 read model when a clock value is supplied', () => {
    const response = readProjectRegistry(
      new Date('2026-09-11T17:30:00.000Z'),
    )

    expect(response).toEqual({
      schemaVersion: 'v1',
      generatedAt: '2026-09-11T17:30:00.000Z',
      projects: registeredProjects,
    })
  })
})
