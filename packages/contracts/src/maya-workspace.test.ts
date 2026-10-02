import { describe, expect, it } from 'vitest'
import { parseMayaWorkspace, safeProductUrl } from './maya-workspace.js'

const valid = {
  schemaVersion: 'maya.workspace.v1', projectId: 'orbis-maya',
  checkedAt: '2026-10-02T12:00:00Z', revision: 'a'.repeat(40), version: '0.1.0',
  publicUrl: 'https://maya.example/app', developmentUrl: null,
}

describe('Maya workspace boundary', () => {
  it.each([undefined, null, 1, '', 'http://example.com', 'https://localhost',
    'https://test.localhost', 'https://127.0.0.1', 'https://[::1]',
    'https://user:password@example.com', 'https://:password@example.com', 'https://user@example.com', 'javascript:alert(1)'])('rejects unsuitable product URL %s', (value) => expect(safeProductUrl(value)).toBeNull())
  it('normalizes HTTPS URLs', () => expect(safeProductUrl('https://maya.example')).toBe('https://maya.example/'))
  it('normalizes the contract without passing arbitrary fields through', () => {
    expect(parseMayaWorkspace({ ...valid, secret: 'never-forward' })).toEqual(valid)
    expect(parseMayaWorkspace({ ...valid, revision: null, version: null, publicUrl: null })).toEqual({
      ...valid, revision: null, version: null, publicUrl: null,
    })
  })
  it.each([null, 0, 'text'])('rejects non-record input', (value) => {
    expect(() => parseMayaWorkspace(value)).toThrow('Invalid Maya workspace')
  })
  it.each([
    { schemaVersion: 'v2' }, { projectId: 'orbis-admin' },
    { checkedAt: 1 }, { checkedAt: 'invalid' }, { version: undefined },
    { revision: 'bad' }, { version: 'x'.repeat(81) },
    { publicUrl: 'http://example.com' }, { developmentUrl: 'javascript:alert(1)' },
  ])('rejects invalid fields %j', (change) => {
    expect(() => parseMayaWorkspace({ ...valid, ...change })).toThrow()
  })
})
