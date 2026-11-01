import { describe, expect, it } from 'vitest'
import { ownerReturnPath, ownerSignInPath } from './owner-navigation'
describe('owner login navigation',()=>{
  it('returns only to known Admin pages, never external or arbitrary input',()=>{
    for(const path of ['/operations','/customers','/projects/orbis-maya']) {
      expect(ownerReturnPath('?returnTo='+encodeURIComponent(path))).toBe(path)
      expect(ownerSignInPath(path)).toBe('/account?returnTo='+encodeURIComponent(path))
    }
    for(const value of ['', '?returnTo=https://evil.test','?returnTo=//evil.test','?returnTo=/unknown'])expect(ownerReturnPath(value)).toBeNull()
    expect(ownerSignInPath('/')).toBe('/account?returnTo=%2Foperations')
  })
})
