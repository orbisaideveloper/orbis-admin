import './CustomerAccount.css'
import { CustomerProfile } from './CustomerProfile'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createCustomerSessionClient, type CentralSession } from '@orbis-admin/contracts'

type Client = ReturnType<typeof createCustomerSessionClient>
export async function loadCustomerClient(): Promise<Client | null> {
  const response = await fetch('/api/v1/customer/config', { cache: 'no-store', signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error('CUSTOMER_SERVICE_UNAVAILABLE')
  const body: unknown = await response.json()
  if (!body || typeof body !== 'object' || !('available' in body) || body.available !== true) return null
  return createCustomerSessionClient({ baseUrl: window.location.origin, storage: localStorage })
}
export function CustomerAccount({ load = loadCustomerClient }: { load?: () => Promise<Client | null> }) {
  const [client, setClient] = useState<Client | null>(null)
  const [session, setSession] = useState<CentralSession | null>(null)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [contact, setContact] = useState<'phone' | 'email'>('phone')
  const [message, setMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  const signingOut = useRef(false)
  useEffect(() => {
    let active = true
    setChecking(true)
    void (async () => {
      try {
        const next = await load()
        if (!active) return
        setClient(next)
        if (!next) { setMessage('অ্যাকাউন্ট পরিষেবা এখন পাওয়া যাচ্ছে না।'); return }
        const restored = await next.restore()
        if (active) { setSession(restored); setMessage('') }
      } catch { if (active) setMessage('সংযোগ করা যায়নি। আবার চেষ্টা করুন।') }
      finally { if (active) setChecking(false) }
    })()
    return () => { active = false }
  }, [load, attempt])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!client || busy) return
    const form = event.currentTarget
    const data = new FormData(form)
    const read = (key: string) => String(data.get(key) ?? '')
    const identifier = read('identifier').trim(), password = read('password'), name = read('name').trim()
    if (!identifier || !password || (mode === 'signup' && (!name || password.length < 8))) {
      setMessage('নাম, যোগাযোগের তথ্য ও পাসওয়ার্ড ঠিক করে দিন।'); return
    }
    setBusy(true); setMessage('')
    try {
      const result = await client.authenticate(mode, { identifier, password, ...(mode === 'signup' ? { name } : {}) })
      setSession(result)
      form.reset()
    } catch { setMessage('প্রবেশ করা যায়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।') }
    finally {
      const passwordField = form.elements.namedItem('password')
      if (passwordField instanceof HTMLInputElement) passwordField.value = ''
      setBusy(false)
    }
  }
  async function logout(activeClient: Client) {
    if (signingOut.current) return
    signingOut.current = true
    setBusy(true); setMessage('')
    try { await activeClient.logout(); setSession(null) }
    catch { setSession(null); setMessage('এই ডিভাইস থেকে বেরিয়েছেন। পরিষেবায় sign out নিশ্চিত হয়নি।') }
    finally { signingOut.current = false; setBusy(false) }
  }
  return <main className="detail-panel customer-account" aria-labelledby="customer-account-title">
    <h1 id="customer-account-title">আপনার Orbis অ্যাকাউন্ট</h1>
    <p>সব Orbis অ্যাপের জন্য একটি অ্যাকাউন্ট ও একটি স্থায়ী Orbis ID।</p>
    {checking ? <output>অ্যাকাউন্ট যাচাই হচ্ছে…</output> : session && client ? <section aria-label="বর্তমান অ্যাকাউন্ট">
      <p>আপনি লগইন করেছেন।</p>
      <p>Orbis ID: <strong>{session.customer.displayId}</strong></p>
      <p>সাধারণ প্রোফাইল সব অ্যাপে একই থাকবে। অ্যাপের নিজস্ব তথ্য এই ID-র সঙ্গে আলাদাভাবে থাকবে।</p>
      <button type="button" disabled={busy} onClick={() => { void logout(client) }}>Sign out</button>
      <CustomerProfile client={client} customer={session.customer} />
    </section> : client ? <>
      <div className="page-nav-buttons">
        <button type="button" disabled={busy} aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setMessage('') }}>লগইন</button>
        <button type="button" disabled={busy} aria-pressed={mode === 'signup'} onClick={() => { setMode('signup'); setMessage('') }}>অ্যাকাউন্ট তৈরি</button>
      </div>
      <form key={mode} noValidate onSubmit={event => { void submit(event) }} aria-label="Orbis customer account">
        <fieldset disabled={busy}>
          {mode === 'signup' ? <label>নাম<input name="name" autoComplete="name" maxLength={120} required /></label> : null}
          <label>যোগাযোগের ধরন<select value={contact} onChange={event => setContact(event.target.value === 'email' ? 'email' : 'phone')}>
            <option value="phone">ফোন নম্বর</option><option value="email">ইমেইল</option>
          </select></label>
          <label>{contact === 'phone' ? 'ফোন নম্বর' : 'ইমেইল'}<input name="identifier" type={contact === 'phone' ? 'tel' : 'email'} autoComplete="username" maxLength={254} required /></label>
          <label>পাসওয়ার্ড<input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} maxLength={256} required /></label>
          <button type="submit">{busy ? 'অপেক্ষা করুন…' : mode === 'signup' ? 'অ্যাকাউন্ট তৈরি করুন' : 'প্রবেশ করুন'}</button>
        </fieldset>
      </form>
    </> : null}
    {message ? <p role="alert">{message}</p> : null}
    {!checking && message ? <button type="button" disabled={busy} onClick={() => setAttempt(value => value + 1)}>আবার চেষ্টা করুন</button> : null}
  </main>
}
