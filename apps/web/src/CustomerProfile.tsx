import { useEffect, useState, type SyntheticEvent } from 'react'
import type { CentralSession, createCustomerSessionClient } from '@orbis-admin/contracts'
type Client = ReturnType<typeof createCustomerSessionClient>
type Profile = { name: string; address: string | null; alternatePhone: string | null; dateOfBirth: string | null; gender: 'male' | 'female' | 'other' | 'prefer-not-to-say' | null }
type Response = { profile: Profile; contact: { email: string | null; phone: string | null } }
export async function customerProfileRequest(client: Client, identity: CentralSession['customer'], signal: AbortSignal, patch?: Profile): Promise<Response> {
  const token = await client.accessToken()
  if (!token || client.snapshot()?.customer.orbisIdentityId !== identity.orbisIdentityId) throw new Error('CUSTOMER_LOGIN_REQUIRED')
  const response = await fetch('/api/v1/customer/profile', { method: patch ? 'POST' : 'GET', cache: 'no-store', signal,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: patch ? JSON.stringify(patch) : undefined })
  if (!response.ok) throw new Error('PROFILE_UNAVAILABLE')
  const value: unknown = await response.json()
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 'orbis.customer.profile.v1' || !('customer' in value) || !value.customer || typeof value.customer !== 'object' || !('orbisIdentityId' in value.customer) || value.customer.orbisIdentityId !== identity.orbisIdentityId || !('displayId' in value.customer) || value.customer.displayId !== identity.displayId || !('profile' in value) || !value.profile || typeof value.profile !== 'object' || !('contact' in value) || !value.contact || typeof value.contact !== 'object') throw new Error('PROFILE_INVALID')
  const profile = value.profile as Record<string, unknown>, contact = value.contact as Record<string, unknown>
  if (typeof profile.name !== 'string' || !profile.name.trim() || profile.name.length > 120 || (profile.address !== null && (typeof profile.address !== 'string' || profile.address.length > 1000)) || (profile.alternatePhone !== null && typeof profile.alternatePhone !== 'string') || (profile.dateOfBirth !== null && typeof profile.dateOfBirth !== 'string') || (profile.gender !== null && profile.gender !== 'male' && profile.gender !== 'female' && profile.gender !== 'other' && profile.gender !== 'prefer-not-to-say') || (contact.email !== null && typeof contact.email !== 'string') || (contact.phone !== null && typeof contact.phone !== 'string')) throw new Error('PROFILE_INVALID')
  return { profile: { name: profile.name, address: profile.address, alternatePhone: profile.alternatePhone, dateOfBirth: profile.dateOfBirth, gender: profile.gender }, contact: { email: contact.email, phone: contact.phone } }
}
export function CustomerProfile({ client, customer }: Readonly<{ client: Client; customer: CentralSession['customer'] }>) {
  const [data, setData] = useState<Response | null>(null), [busy, setBusy] = useState(true), [message, setMessage] = useState(''), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setData(null); setBusy(true); setMessage('')
    void customerProfileRequest(client, customer, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)])).then(
      result => { if (active) setData(result) },
      () => { if (active) setMessage('প্রোফাইল পাওয়া যায়নি। আবার চেষ্টা করুন।') },
    ).finally(() => { if (active) setBusy(false) })
    return () => { active = false; controller.abort() }
  }, [client, customer, attempt])
  async function save(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !data) return
    const form = new FormData(event.currentTarget), read = (key: string) => { const value = form.get(key); return typeof value === 'string' ? value.trim() : '' }
    const gender = read('gender')
    if (!read('name') || (gender && !['male', 'female', 'other', 'prefer-not-to-say'].includes(gender))) { setMessage('প্রোফাইলের তথ্য ঠিক করে দিন।'); return }
    const patch: Profile = { name: read('name'), address: read('address') || null, alternatePhone: read('alternatePhone') || null, dateOfBirth: read('dateOfBirth') || null, gender: (gender || null) as Profile['gender'] }
    setBusy(true); setMessage('')
    try {
      const result = await customerProfileRequest(client, customer, AbortSignal.timeout(10000), patch)
      if (client.snapshot()?.customer.orbisIdentityId === customer.orbisIdentityId) { setData(result); setMessage('প্রোফাইল সংরক্ষিত হয়েছে।') }
    } catch { setMessage('প্রোফাইল সংরক্ষণ নিশ্চিত হয়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।') }
    finally { setBusy(false) }
  }
  return <section aria-label="সাধারণ প্রোফাইল"><h2>সাধারণ প্রোফাইল</h2>
    {busy ? <output>প্রোফাইল যাচাই হচ্ছে…</output> : null}
    {data ? <><p>ইমেইল: {data.contact.email ?? '—'}</p><p>ফোন: {data.contact.phone ?? '—'}</p>
      <form key={attempt} noValidate aria-label="সাধারণ প্রোফাইল সম্পাদনা" onSubmit={event => { void save(event) }}><fieldset disabled={busy}>
        <label>প্রোফাইলের নাম<input name="name" defaultValue={data.profile.name} maxLength={120} autoComplete="name" required /></label>
        <label>ঠিকানা<input name="address" defaultValue={data.profile.address ?? ''} maxLength={1000} autoComplete="street-address" /></label>
        <label>বিকল্প ফোন<input name="alternatePhone" type="tel" defaultValue={data.profile.alternatePhone ?? ''} maxLength={40} /></label>
        <label>জন্মতারিখ<input name="dateOfBirth" type="date" defaultValue={data.profile.dateOfBirth ?? ''} min="1900-01-01" max={new Date().toISOString().slice(0, 10)} /></label>
        <label>লিঙ্গ<select name="gender" defaultValue={data.profile.gender ?? ''}><option value="">উল্লেখ করা হয়নি</option><option value="male">পুরুষ</option><option value="female">মহিলা</option><option value="other">অন্যান্য</option><option value="prefer-not-to-say">বলতে চাই না</option></select></label>
        <button type="submit">প্রোফাইল সংরক্ষণ করুন</button>
      </fieldset></form></> : null}
    {message ? <output>{message}</output> : null}
    <button type="button" disabled={busy} onClick={() => setAttempt(value => value + 1)}>প্রোফাইল আবার পড়ুন</button>
  </section>
}
