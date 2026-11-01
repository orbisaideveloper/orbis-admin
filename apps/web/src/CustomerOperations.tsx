import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { parseCustomerObservability, type CustomerObservability } from '@orbis-admin/contracts'
import { loadOwnerAuth, type OwnerAuth } from './owner-auth'
import { OperationsPanels } from './OperationsPanels'
import './CustomerOperations.css'

const time = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
export async function readOperations(auth: OwnerAuth, query: string, signal: AbortSignal) {
  const token = await auth.token()
  if (!token) throw new Error('OWNER_LOGIN_REQUIRED')
  const response = await fetch('/api/v1/admin/customer-observability?' + query, {
    cache: 'no-store', signal, headers: { authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('OBSERVABILITY_UNAVAILABLE')
  return parseCustomerObservability(await response.json())
}
export function CustomerOperations({ load = loadOwnerAuth }: Readonly<{ load?: () => Promise<OwnerAuth | null> }>) {
  const [params] = useSearchParams()
  const query = new URLSearchParams([...params].filter(([key]) => key !== 'view' && key !== 'page')).toString()
  const [data, setData] = useState<CustomerObservability | null>(null)
  const [message, setMessage] = useState('যাচাই হচ্ছে…')
  const [busy, setBusy] = useState(true)
  const [auth, setAuth] = useState<OwnerAuth | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true, owner: OwnerAuth | null = null
    const controller = new AbortController()
    setData(null); setAuth(null); setBusy(true); setMessage('যাচাই হচ্ছে…')
    void (async () => {
      try {
        owner = await load()
        if (!active) { owner?.dispose(); return }
        setAuth(owner)
        if (!owner || !(await owner.token())) { setMessage('এই তথ্য দেখতে Admin লগইন করুন।'); return }
        const result = await readOperations(owner, query, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
        if (active) { setData(result); setMessage('') }
      } catch { if (active) setMessage('তথ্য পাওয়া যায়নি। Admin অনুমতি, observability configuration ও database release যাচাই করুন।') }
      finally { if (active) setBusy(false) }
    })()
    return () => { active = false; controller.abort(); owner?.dispose() }
  }, [load, query, attempt])
  async function signIn() {
    setData(null); setBusy(true)
    try { await auth!.login(); setMessage('লগইন সম্পন্ন হলে আবার যাচাই করুন।') }
    catch { setMessage('Admin লগইন শুরু করা যায়নি।') }
    finally { setBusy(false) }
  }
  const scope = params.get('project')
  const title = scope === 'orbis-khata' ? 'ORBIS Khata' : 'সেন্ট্রাল গ্রাহক'
  return <main className="customer-operations" aria-labelledby="operations-title">
    <nav aria-label="Operations navigation"><Link to={scope ? '/projects/' + scope : '/'}>← ফিরে যান</Link><Link to="/">⌂ Admin হোম</Link></nav>
    <header><p className="kicker">ORBIS ADMIN</p><h1 id="operations-title">{title}</h1><p>গ্রাহক ও লগইন কার্যকলাপ</p></header>
    <div className="ops-actions"><button type="button" disabled={busy} onClick={() => setAttempt(value => value + 1)}>আবার যাচাই করুন</button>
      {auth && !data ? <button type="button" disabled={busy} onClick={() => { void signIn() }}>Admin লগইন</button> : null}</div>
    {message ? <output>{message}</output> : null}
    {data ? <><p className="ops-checked">সর্বশেষ যাচাই: {time(data.checkedAt)}</p><OperationsPanels data={data} params={params}/></> : null}
  </main>
}
