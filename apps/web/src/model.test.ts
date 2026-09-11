import { describe, expect, it } from 'vitest'
import {
  aggregateTone,
  commandAreas,
  findCommandArea,
  findProject,
  projects,
  toneLabel,
} from './model'

describe('command center model', () => {
  it('keeps the approved twelve command areas', () => {
    expect(commandAreas).toHaveLength(12)
    expect(findCommandArea('projects')?.title).toBe('Projects')
    expect(findCommandArea('missing')).toBeUndefined()
  })

  it('resolves registered project fixtures', () => {
    expect(projects).toHaveLength(3)
    expect(findProject('orbis-admin')?.repository).toBe('orbisaideveloper/orbis-admin')
    expect(findProject('missing')).toBeUndefined()
  })

  it('aggregates attention, planned and healthy states', () => {
    expect(aggregateTone(['healthy', 'attention'])).toBe('attention')
    expect(aggregateTone(['planned', 'planned'])).toBe('planned')
    expect(aggregateTone(['healthy', 'planned'])).toBe('healthy')
  })

  it('returns readable labels for every tone', () => {
    expect(toneLabel('attention')).toBe('Needs attention')
    expect(toneLabel('planned')).toBe('Planned')
    expect(toneLabel('healthy')).toBe('Healthy')
  })
})
