import { useEffect, useRef, useState } from 'react'
import { loadOwnerAuth, type OwnerAuth } from './owner-auth'
import './CustomerAccount.css'

type Row = { orbisIdentityId: string; displayId: string; name: string; email: string | null; phone: string | null }
type Page = { rows: Row[]; nextCursor: string | null }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
export function parseCustomerPage(value: unknown): Page {
  if (!value || typeof value !== 'object' || !('rows' in value) || !Array.isArray(value.rows) || value.rows.length > 50 || !('nextCursor' in value) || (value.nextCursor !== null && (typeof value.nextCursor !== 'string' || !uuid.test(value.nextCursor)))) throw new Error('INVALID_DIRECTORY')
  const rows = value.rows.map((item: unknown): Row => {
    if (!item || typeof item !== 'object') throw new Error('INVALID_DIRECTORY')
    const row = item as Record<string, unknown>
    if (typeof row.orbisIdentityId !== 'string' || !uuid.test(row.orbisIdentityId) || typeof row.displayId !== 'string' || !/^ORB-U-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/u.test(row.displayId) || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 120 || (row.email !== null && (typeof row.email !== 'string' || row.email.length > 254)) || (row.phone !== null && (typeof row.phone !== 'string' || row.phone.length > 40))) throw new Error('INVALID_DIRECTORY')
    return { orbisIdentityId: row.orbisIdentityId, displayId: row.displayId, name: row.name, email: row.email, phone: row.phone }
  })
  if (new Set(rows.map(row => row.orbisIdentityId)).size !== rows.length || (value.nextCursor !== null && value.nextCursor !== rows.at(-1)?.orbisIdentityId)) throw new Error('INVALID_DIRECTORY')
  return { rows, nextCursor: value.nextCursor }
}
export async function readCustomerPage(auth: OwnerAuth, after: string | null, signal: AbortSignal): Promise<Page> {
  const token = await auth.token()
  if (!token) throw new Error('OWNER_LOGIN_REQUIRED')
  const response = await fetch(`/api/v1/admin/customers${after ? `?after=${encodeURIComponent(after)}` : ''}`, {
    cache: 'no-store', headers: { authorization: `Bearer ${token}` }, signal,
  })
  if (!response.ok) throw new Error('DIRECTORY_UNAVAILABLE')
  return parseCustomerPage(await response.json())
}
export function CustomerDirectory({ load = loadOwnerAuth }: { load?: () => Promise<OwnerAuth | null> }) {
  const [auth, setAuth] = useState<OwnerAuth | null>(null)
  const [page, setPage] = useState<Page | null>(null)
  const [history, setHistory] = useState<(string | null)[]>([null])
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState('অ্যাকাউন্ট যাচাই হচ্ছে…')
  const [attempt, setAttempt] = useState(0)
  const revision = useRef(0)
  const working = useRef(true)
  const currentAbort = useRef<AbortController | null>(null)
  useEffect(() => {
    let active = true, current: OwnerAuth | null = null
    working.current = true
    setBusy(true); setPage(null); setAuth(null); setHistory([null])
    const requestId = ++revision.current
    const controller = new AbortController(); currentAbort.current = controller
    void (async () => {
      try {
        current = await load()
        if (!active) { current?.dispose(); return }
        setAuth(current)
        if (!current) { setMessage('Admin লগইন পরিষেবা পাওয়া যাচ্ছে না।'); return }
        if (!(await current.token())) { setMessage('গ্রাহকদের তালিকা দেখতে Admin লগইন করুন।'); return }
        const result = await readCustomerPage(current, null, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
        if (active && requestId === revision.current) { setPage(result); setMessage('') }
      } catch { if (active && requestId === revision.current) setMessage('তালিকা পাওয়া যায়নি। Admin অনুমতি ও সংযোগ যাচাই করুন।') }
      finally { if (active && requestId === revision.current) { working.current = false; setBusy(false) } }
    })()
    return () => { active = false; ++revision.current; controller.abort(); currentAbort.current?.abort(); current?.dispose() }
  }, [load, attempt])
  async function navigate(activeAuth: OwnerAuth, nextHistory: (string | null)[]) {
    if (working.current) return
    working.current = true
    const requestId = ++revision.current
    const controller = new AbortController(); currentAbort.current?.abort(); currentAbort.current = controller
    setBusy(true); setPage(null); setMessage('')
    try {
      const result = await readCustomerPage(activeAuth, nextHistory.at(-1) ?? null, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      if (requestId === revision.current) { setPage(result); setHistory(nextHistory) }
    } catch { if (requestId === revision.current) setMessage('তালিকা পাওয়া যায়নি। Admin অনুমতি ও সংযোগ যাচাই করুন।') }
    finally { if (requestId === revision.current) { working.current = false; setBusy(false) } }
  }
  async function ownerAction(activeAuth: OwnerAuth, action: 'login' | 'logout') {
    if (working.current) return
    working.current = true
    const requestId = ++revision.current
    currentAbort.current?.abort(); setPage(null); setBusy(true)
    try {
      await activeAuth[action]()
      if (requestId === revision.current) { setMessage(action === 'logout' ? 'Admin অ্যাকাউন্ট থেকে বেরিয়েছেন।' : 'Admin লগইন সম্পন্ন হলে আবার যাচাই করুন।'); setHistory([null]) }
    } catch { if (requestId === revision.current) setMessage('Admin লগইন পরিবর্তন নিশ্চিত হয়নি। আবার যাচাই করুন।') }
    finally { if (requestId === revision.current) { working.current = false; setBusy(false) } }
  }
  return <main className="detail-panel customer-account" aria-labelledby="customer-directory-title">
    <a href="/">Admin হোম</a><h1 id="customer-directory-title">Orbis গ্রাহকদের তালিকা</h1>
    {busy ? <output aria-live="polite">তালিকা যাচাই হচ্ছে…</output> : null}
    {message ? <p role="status">{message}</p> : null}
    <div className="page-nav-buttons">
      {auth ? <><button type="button" disabled={busy} onClick={() => { void ownerAction(auth, 'login') }}>Admin লগইন</button><button type="button" disabled={busy} onClick={() => { void ownerAction(auth, 'logout') }}>Admin sign out</button></> : null}
      <button type="button" disabled={busy} onClick={() => setAttempt(value => value + 1)}>আবার যাচাই করুন</button>
    </div>
    {page && auth ? <section aria-label="গ্রাহকদের পরিচয়">
      {page.rows.length === 0 ? <p>গ্রাহক পাওয়া যায়নি।</p> : <ul>{page.rows.map(row => <li key={row.orbisIdentityId}>
        <h2>{row.name}</h2><dl><dt>Orbis ID</dt><dd>{row.displayId}</dd><dt>স্থায়ী ID</dt><dd>{row.orbisIdentityId}</dd><dt>ইমেইল</dt><dd>{row.email ?? '—'}</dd><dt>ফোন</dt><dd>{row.phone ?? '—'}</dd></dl>
      </li>)}</ul>}
      <div className="page-nav-buttons"><button type="button" disabled={busy || history.length < 2} onClick={() => { void navigate(auth, history.slice(0, -1)) }}>আগের পাতা</button><button type="button" disabled={busy || !page.nextCursor} onClick={() => { void navigate(auth, [...history, page.nextCursor]) }}>পরের পাতা</button></div>
    </section> : null}
  </main>
}
