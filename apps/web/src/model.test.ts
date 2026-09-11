import { describe, expect, it } from 'vitest'
import {
  aggregateTone,
  commandAreas,
  findCommandArea,
  findProject,
  githubRepositoryUrl,
  modulesLabel,
  releaseLabel,
  repositoryLabel,
  toneLabel,
  usersLabel,
} from './model'
import { projectRegistryFixture } from './test/project-registry-fixture'

describe('command center model', () => {
  const [admin, foundation, game] = projectRegistryFixture.projects

  it('keeps twelve UI command areas without pretending provider data is already live', () => {
    expect(commandAreas).toHaveLength(12)
    expect(findCommandArea('projects')?.metric).toBe('API-backed registry')
    expect(findCommandArea('github')?.metric).toBe('Adapter next')
    expect(findCommandArea('missing')).toBeUndefined()
  })

  it('finds projects from the supplied canonical registry rather than a web-owned fixture', () => {
    expect(findProject(projectRegistryFixture.projects, 'orbis-admin')).toBe(
      admin,
    )
    expect(
      findProject(projectRegistryFixture.projects, 'missing'),
    ).toBeUndefined()
  })

  it('aggregates every supported signal state', () => {
    expect(aggregateTone(['healthy', 'attention'])).toBe('attention')
    expect(aggregateTone(['healthy', 'unknown'])).toBe('unknown')
    expect(aggregateTone(['planned', 'planned'])).toBe('planned')
    expect(aggregateTone(['healthy', 'planned'])).toBe('healthy')
  })

  it('returns readable labels for every tone', () => {
    expect(toneLabel('attention')).toBe('Needs attention')
    expect(toneLabel('planned')).toBe('Planned')
    expect(toneLabel('unknown')).toBe('Unknown')
    expect(toneLabel('healthy')).toBe('Healthy')
  })

  it('formats nullable registry values for the existing UI', () => {
    expect(repositoryLabel(admin)).toBe('orbisaideveloper/orbis-admin')
    expect(repositoryLabel(game)).toBe('Not registered')
    expect(releaseLabel(null)).toBe('Not reported')
    expect(releaseLabel('v1.2.3')).toBe('v1.2.3')
    expect(modulesLabel(null)).toBe('Not reported')
    expect(modulesLabel(foundation.modules)).toBe('4')
    expect(usersLabel(admin)).toBe('owner only')
    expect(usersLabel(foundation)).toBe('42')
  })

  it('derives safe GitHub destinations only from registered metadata', () => {
    expect(githubRepositoryUrl(admin)).toBe(
      'https://github.com/orbisaideveloper/orbis-admin',
    )
    expect(githubRepositoryUrl(game)).toBeUndefined()
  })
})
