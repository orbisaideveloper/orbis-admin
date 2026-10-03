import { afterEach, describe, expect, it, vi } from 'vitest'
import { publicOwnerAuthConfig } from './auth-config.js'
afterEach(() => vi.unstubAllEnvs())
describe('public owner configuration never includes privileged keys', () => {
  it('disables absent credentials even with a trusted origin', () => {
    vi.stubEnv('ORBIS_ADMIN_SUPABASE_URL', undefined)
    vi.stubEnv('ORBIS_ADMIN_SUPABASE_PUBLISHABLE_KEY', undefined)
    expect(publicOwnerAuthConfig()).toBeNull()
    vi.stubEnv('ORBIS_ADMIN_SUPABASE_URL', 'https://aqcwhqdzniruvoqwfsij.supabase.co')
    expect(publicOwnerAuthConfig()).toBeNull()
  })
  it('disables missing or untrusted configuration', () => {
    vi.stubEnv('ORBIS_ADMIN_SUPABASE_URL', '')
    expect(publicOwnerAuthConfig()).toBeNull()
  })
  it.each(['sb_secret_do-not-expose', '', 'bad', 'header.e30.signature',
    `header.${Buffer.from('null').toString('base64url')}.signature`,
    `header.${Buffer.from('"bad"').toString('base64url')}.signature`,
    `header.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`])('rejects private or malformed key %s', (key) => {
    vi.stubEnv('ORBIS_ADMIN_SUPABASE_URL', 'https://aqcwhqdzniruvoqwfsij.supabase.co')
    vi.stubEnv('ORBIS_ADMIN_SUPABASE_PUBLISHABLE_KEY', key)
    expect(publicOwnerAuthConfig()).toBeNull()
  })
  it.each(['sb_publishable_public', `header.${Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')}.signature`])('returns only approved public login values', (key) => {
    vi.stubEnv('ORBIS_ADMIN_SUPABASE_URL', 'https://aqcwhqdzniruvoqwfsij.supabase.co')
    vi.stubEnv('ORBIS_ADMIN_SUPABASE_PUBLISHABLE_KEY', key)
    expect(publicOwnerAuthConfig()).toEqual({ origin: 'https://aqcwhqdzniruvoqwfsij.supabase.co', publishableKey: key })
  })
})
