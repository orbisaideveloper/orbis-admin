import './CustomerAccount.css'
import { CustomerProfile } from './CustomerProfile'
import { useEffect, useRef, useState, type SyntheticEvent, type Dispatch, type SetStateAction } from 'react'
import { createCustomerSessionClient, type CentralSession } from '@orbis-admin/contracts'

type Client = ReturnType<typeof createCustomerSessionClient>
export async function loadCustomerClient(): Promise<Client | null> {
  const response = await fetch('/api/v1/customer/config', { cache: 'no-store', signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error('CUSTOMER_SERVICE_UNAVAILABLE')
  const body: unknown = await response.json()
  if (!body || typeof body !== 'object' || !('available' in body) || body.available !== true) return null
  return createCustomerSessionClient({ baseUrl: window.location.origin, storage: localStorage })
}
type Setter<T> = Dispatch<SetStateAction<T>>
function useCustomerInitialization(load: () => Promise<Client | null>, attempt: number,
  setChecking: Setter<boolean>, setClient: Setter<Client | null>,
  setSession: Setter<CentralSession | null>, setMessage: Setter<string>) {
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
  }, [load, attempt, setChecking, setClient, setSession, setMessage])
}
function SignedInAccount({ session, client, busy, logout }: Readonly<{
  session: CentralSession; client: Client; busy: boolean; logout: (client: Client) => Promise<void>
}>) { return <section aria-label="বর্তমান অ্যাকাউন্ট">
      <p>আপনি লগইন করেছেন।</p>
      <p>Orbis ID: <strong>{session.customer.displayId}</strong></p>
      <p>সাধারণ প্রোফাইল সব অ্যাপে একই থাকবে। অ্যাপের নিজস্ব তথ্য এই ID-র সঙ্গে আলাদাভাবে থাকবে।</p>
      <button type="button" disabled={busy} onClick={() => { void logout(client) }}>Sign out</button>
      <CustomerProfile client={client} customer={session.customer} />
    </section> }
function AccountForm({ busy, mode, contact, setMode, setContact, setMessage, submit }: Readonly<{
  busy: boolean; mode: 'login' | 'signup'; contact: 'phone' | 'email';
  setMode: Setter<'login' | 'signup'>; setContact: Setter<'phone' | 'email'>;
  setMessage: Setter<string>; submit: (event: SyntheticEvent<HTMLFormElement>) => Promise<void>
}>) {
  let submitLabel = mode === 'signup' ? 'অ্যাকাউন্ট তৈরি করুন' : 'প্রবেশ করুন'
  if (busy) submitLabel = 'অপেক্ষা করুন…'
  return <>
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
          <button type="submit">{submitLabel}</button>
        </fieldset>
      </form>
    </>
}
function customerSubmission(client: Client | null, busy: boolean, mode: 'login' | 'signup',
  setSession: Setter<CentralSession | null>, setBusy: Setter<boolean>, setMessage: Setter<string>) {
  return async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!client || busy) return
    const form = event.currentTarget
    const data = new FormData(form)
    const read = (key: string) => { const value = data.get(key); return typeof value === 'string' ? value : '' }
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
}
export function CustomerAccount({ load = loadCustomerClient }: Readonly<{ load?: () => Promise<Client | null> }>) {
  const [client, setClient] = useState<Client | null>(null)
  const [session, setSession] = useState<CentralSession | null>(null)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [contact, setContact] = useState<'phone' | 'email'>('phone')
  const [message, setMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  const signingOut = useRef(false)
  useCustomerInitialization(load, attempt, setChecking, setClient, setSession, setMessage)
  const submit = customerSubmission(client, busy, mode, setSession, setBusy, setMessage)
  async function logout(activeClient: Client) {
    if (signingOut.current) return
    signingOut.current = true
    setBusy(true); setMessage('')
    try { await activeClient.logout(); setSession(null) }
    catch { setSession(null); setMessage('এই ডিভাইস থেকে বেরিয়েছেন। পরিষেবায় sign out নিশ্চিত হয়নি।') }
    finally { signingOut.current = false; setBusy(false) }
  }
  let accountView = null
  if (checking) accountView = <output>অ্যাকাউন্ট যাচাই হচ্ছে…</output>
  else if (session && client) accountView = <SignedInAccount session={session} client={client} busy={busy} logout={logout} />
  else if (client) accountView = <AccountForm busy={busy} mode={mode} contact={contact} setMode={setMode} setContact={setContact} setMessage={setMessage} submit={submit} />
  return <main className="detail-panel customer-account" aria-labelledby="customer-account-title">
    <h1 id="customer-account-title">আপনার Orbis অ্যাকাউন্ট</h1>
    <p>সব Orbis অ্যাপের জন্য একটি অ্যাকাউন্ট ও একটি স্থায়ী Orbis ID।</p>
    {accountView}
    {message ? <p role="alert">{message}</p> : null}
    {!checking && message ? <button type="button" disabled={busy} onClick={() => setAttempt(value => value + 1)}>আবার চেষ্টা করুন</button> : null}
  </main>
}
