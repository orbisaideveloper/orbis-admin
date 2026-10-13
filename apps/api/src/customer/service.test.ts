import { describe, expect, it, vi } from 'vitest'
import { createCustomerService } from './service'
const userId = '11111111-1111-4111-8111-111111111111'
const sessionId = '33333333-3333-4333-8333-333333333333'
const access = 'header.' + Buffer.from(JSON.stringify({ sub: userId, iss: 'https://aqcwhqdzniruvoqwfsij.supabase.co/auth/v1', role: 'authenticated', session_id: sessionId })).toString('base64url') + '.signature'
const orbisIdentityId = '11111111-1111-7111-8111-111111111111'
const binding = { orbisIdentityId, displayId: 'ORB-U-23456789' }
const user = { id: userId, user_metadata: { display_name: 'অজয়', role: 'owner' } }
const session = { access_token: access, refresh_token: 'refresh', expires_in: 3600 }
const settings = { external: { email: true, phone: true }, mailer_autoconfirm: true, phone_autoconfirm: true }
function setup(values: unknown[]) {
  const mock = vi.fn()
  for (const value of values) mock.mockResolvedValueOnce(value instanceof Response ? value : Response.json(value))
  const service = createCustomerService({ enabled: true, origin: 'https://aqcwhqdzniruvoqwfsij.supabase.co', publicKey: 'public', serviceKey: 'private', fetchImpl: mock })
  return { service, mock }
}
describe('central customer authentication', () => {
  it('signs up a phone customer through the central authority and returns its stable ID', async () => {
    const { service, mock } = setup([settings, session, user, binding])
    const result = await service.authenticate({ name: 'অজয়', identifier: '9876543210', password: 'password' }, true)
    expect(result.customer).toEqual(binding)
    expect(JSON.parse(mock.mock.calls[1][1].body)).toEqual({ phone: '+919876543210', password: 'password', data: { display_name: 'অজয়' } })
    expect(JSON.parse(mock.mock.calls[3][1].body)).toEqual({ p_auth_user_id: userId, p_session_id: sessionId, p_name: 'অজয়' })
    expect(JSON.stringify(result)).not.toContain('private')
    expect(JSON.stringify(result)).not.toContain('owner')
  })
  it('uses the same authority for email signup and ordinary login without per-product accounts', async () => {
    const signup = setup([settings, session, user, binding])
    await signup.service.authenticate({ name: 'Name', identifier: 'A@B.CO', password: 'password' }, true)
    expect(JSON.parse(signup.mock.mock.calls[1][1].body).email).toBe('a@b.co')
    const login = setup([session, { id: userId }, binding])
    expect((await login.service.authenticate({ identifier: 'a@b.co', password: 'p' }, false)).customer).toEqual(binding)
    expect(JSON.parse(login.mock.mock.calls[2][1].body).p_name).toBe('Orbis customer')
  })
  it('refreshes a session, verifies it remotely and keeps the same central ID', async () => {
    const { service, mock } = setup([session, user, binding])
    expect((await service.refresh({ refreshToken: 'refresh' })).customer).toEqual(binding)
    expect(JSON.parse(mock.mock.calls[0][1].body)).toEqual({ refresh_token: 'refresh' })
  })
  it('reads a verified current account and signs out only the current session', async () => {
    const current = setup([user, binding]);expect((await current.service.current(access)).customer).toEqual(binding)
    const logout = setup([user, new Response(null, { status: 204 })]);expect(await logout.service.logout(access)).toEqual({ signedOut: true })
    expect(logout.mock.mock.calls[1][0]).toContain('scope=local')
  })
  it.each([{}, { enabled: true }, { enabled: true, origin: 'https://wrong.example', publicKey: 'public', serviceKey: 'secret' },
    { enabled: true, origin: 'https://aqcwhqdzniruvoqwfsij.supabase.co', publicKey: 'public' }])('fails closed before contacting providers when unconfigured', async options => {
    const fetchImpl = vi.fn();const service = createCustomerService({ ...options, fetchImpl })
    await expect(service.current(access)).rejects.toMatchObject({ code: 'CUSTOMER_AUTH_NOT_CONFIGURED' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it.each([null, {}, { identifier: 'invalid', password: 'p' }])('rejects invalid credentials', async input => {
    await expect(setup([]).service.authenticate(input, false)).rejects.toMatchObject({ code: 'CUSTOMER_INPUT_INVALID' })
  })
  it.each([{ ...settings, disable_signup: true }, { ...settings, mailer_autoconfirm: false }, { ...settings, external: { email: false } }])('does not send email confirmation or sign up when password-only signup is unavailable', async value => {
    const { service, mock } = setup([value])
    await expect(service.authenticate({ name: 'x', identifier: 'a@b.co', password: 'password' }, true)).rejects.toMatchObject({ code: 'CUSTOMER_PASSWORD_SIGNUP_NOT_READY' })
    expect(mock).toHaveBeenCalledTimes(1)
  })
  it('does not send an SMS when phone auto-confirmation is unavailable', async () => {
    await expect(setup([{ ...settings, phone_autoconfirm: false }]).service.authenticate({ name: 'x', identifier: '9876543210', password: 'password' }, true)).rejects.toMatchObject({ code: 'CUSTOMER_PASSWORD_SIGNUP_NOT_READY' })
  })
  it.each([[429, 'CUSTOMER_RATE_LIMITED'], [400, 'CUSTOMER_AUTH_FAILED'], [401, 'CUSTOMER_AUTH_FAILED'], [422, 'CUSTOMER_AUTH_FAILED'], [500, 'CUSTOMER_SERVICE_UNAVAILABLE']])('maps HTTP %i without exposing provider bodies', async (status, code) => {
    await expect(setup([new Response('secret provider body', { status: Number(status) })]).service.current(access)).rejects.toMatchObject({ code })
  })
  it.each(['', 'x'.repeat(8193)])('rejects invalid access tokens', async token => {
    await expect(setup([]).service.current(token)).rejects.toMatchObject({ code: 'CUSTOMER_LOGIN_REQUIRED' })
  })
  it.each([{ id: 'bad' }, { id: 1 }])('rejects malformed remotely verified users', async value => {
    await expect(setup([value]).service.current(access)).rejects.toMatchObject({ code: 'CUSTOMER_LOGIN_REQUIRED' })
  })
  it.each([null, [], 'bad'])('rejects malformed provider objects', async value => {
    await expect(setup([value]).service.current(access)).rejects.toMatchObject({ code: 'CUSTOMER_SERVICE_UNAVAILABLE' })
  })
  it.each([{}, { ...session, access_token: 1 }, { ...session, refresh_token: 1 }, { ...session, refresh_token: '' },
    { ...session, expires_in: '3600' }, { ...session, expires_in: 0 }])('rejects malformed token responses', async value => {
    await expect(setup([value]).service.authenticate({ identifier: 'a@b.co', password: 'p' }, false)).rejects.toMatchObject({ code: 'CUSTOMER_SESSION_UNAVAILABLE' })
  })
  it.each([{}, { ...binding, orbisIdentityId: 1 }, { ...binding, orbisIdentityId: userId }, { ...binding, displayId: 1 }, { ...binding, displayId: 'bad' }])('rejects invalid canonical bindings', async value => {
    await expect(setup([user, value]).service.current(access)).rejects.toMatchObject({ code: 'CUSTOMER_IDENTITY_UNAVAILABLE' })
  })
  it.each([{}, { refreshToken: '' }, { refreshToken: 1 }, { refreshToken: 'x'.repeat(8193) }, { refreshToken: 'x', role: 'owner' }])('rejects invalid refresh input', async body => {
    await expect(setup([]).service.refresh(body)).rejects.toMatchObject({ code: 'CUSTOMER_INPUT_INVALID' })
  })
  it('rejects large or invalid JSON and logout/provider failures', async () => {
    await expect(setup([new Response('x'.repeat(65537))]).service.current(access)).rejects.toMatchObject({ code: 'CUSTOMER_SERVICE_UNAVAILABLE' })
    await expect(setup([new Response('broken')]).service.current(access)).rejects.toThrow()
    await expect(setup([user, new Response('', { status: 503 })]).service.logout(access)).rejects.toMatchObject({ code: 'CUSTOMER_SERVICE_UNAVAILABLE' })
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'))
    await expect(createCustomerService({ enabled: true, origin: 'https://aqcwhqdzniruvoqwfsij.supabase.co', publicKey: 'public', serviceKey: 'private', fetchImpl }).current(access)).rejects.toThrow('network')
  })
  it.each([{ sub: 'wrong' }, { iss: 'https://other.example/auth/v1' }, { role: 'service_role' }, { session_id: 'invalid' }, { session_id: 1 }])('rejects non-customer or unbound session claims after remote token verification', async change => {
    const token = 'header.' + Buffer.from(JSON.stringify({ sub: userId, iss: 'https://aqcwhqdzniruvoqwfsij.supabase.co/auth/v1', role: 'authenticated', session_id: sessionId, ...change })).toString('base64url') + '.signature'
    await expect(setup([user]).service.current(token)).rejects.toMatchObject({ code: 'CUSTOMER_LOGIN_REQUIRED' })
  })
  it('rejects malformed verified JWT claims and invalid refresh payloads', async () => {
    await expect(setup([user]).service.current('not-a-jwt')).rejects.toMatchObject({ code: 'CUSTOMER_LOGIN_REQUIRED' })
    for (const body of [null, [], false]) await expect(setup([]).service.refresh(body)).rejects.toMatchObject({ code: 'CUSTOMER_INPUT_INVALID' })
  })

  it('resolves verified product ownership without rewriting the old local IDs', async () => {
    const value = { projectId: 'orbis-foundation', environment: 'production', orbisIdentityId, localAuthUserId: userId, localAccountId: userId }
    const { service, mock } = setup([user, binding, value])
    expect(await service.product(access, 'orbis-foundation', 'production')).toMatchObject(value)
    expect(JSON.parse(mock.mock.calls[2][1].body)).toEqual({ p_auth_user_id: userId, p_session_id: sessionId, p_project_id: 'orbis-foundation', p_environment: 'production' })
    await expect(setup([user, binding, null]).service.product(access, 'orbis-khata', 'production')).rejects.toMatchObject({ code: 'CUSTOMER_PRODUCT_NOT_LINKED' })
    const invalid = setup([])
    await expect(invalid.service.product(access, 'orbis-admin', 'production')).rejects.toMatchObject({ code: 'CUSTOMER_PRODUCT_INVALID' })
    expect(invalid.mock).not.toHaveBeenCalled()
  })

})

describe('central profile ownership', () => {
  const profile = { name: 'অজয়', address: null, alternatePhone: null, dateOfBirth: null, gender: null }
  it('reads only the remotely verified account and exposes no password', async () => {
    const { service, mock } = setup([{ ...user, email: 'a@b.co', phone: '+919876543210' }, binding, profile])
    const result = await service.profile(access)
    expect(result.profile).toEqual(profile)
    expect(result.customer).toEqual(binding)
    expect(result.contact.email).toBe('a@b.co')
    expect(JSON.parse(mock.mock.calls[2][1].body)).toEqual({ p_auth_user_id: userId, p_session_id: sessionId, p_patch: null })
    expect(JSON.stringify(result)).not.toContain('private')
  })
  it('updates optional common fields without accepting an identity or login change', async () => {
    const { service, mock } = setup([user, binding, { ...profile, address: 'Kolkata' }])
    expect((await service.profile(access, { address: ' Kolkata ' })).profile.address).toBe('Kolkata')
    expect(JSON.parse(mock.mock.calls[2][1].body).p_patch).toEqual({ address: 'Kolkata' })
    const invalid = setup([])
    await expect(invalid.service.profile(access, { orbisIdentityId: userId })).rejects.toMatchObject({ code: 'CUSTOMER_PROFILE_INVALID' })
    expect(invalid.mock).not.toHaveBeenCalled()
  })
  it('rejects malformed profile provider responses', async () => {
    await expect(setup([user, binding, {}]).service.profile(access)).rejects.toMatchObject({ code: 'CUSTOMER_PROFILE_UNAVAILABLE' })
  })
})
