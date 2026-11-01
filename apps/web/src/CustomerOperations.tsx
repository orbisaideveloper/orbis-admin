import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { parseCustomerObservability, type CustomerObservability, type CustomerUsage } from '@orbis-admin/contracts'
import { loadOwnerAuth, type OwnerAuth } from './owner-auth'
import './CustomerOperations.css'

const time = (value: string | null) => value === null ? 'তথ্য নেই' : new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
export async function readOperations(auth: OwnerAuth, query: string, signal: AbortSignal) {
  const token = await auth.token()
  if (!token) throw new Error('OWNER_LOGIN_REQUIRED')
  const response = await fetch('/api/v1/admin/customer-observability?' + query, {
    cache: 'no-store', signal, headers: { authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('OBSERVABILITY_UNAVAILABLE')
  return parseCustomerObservability(await response.json())
}
function CustomerRow({ row }: Readonly<{ row: CustomerUsage }>) {
  return <article className="ops-customer">
    <h2><Link to={'/operations?customer=' + row.authUserId}>{row.name}</Link></h2>
    <dl><dt>Orbis ID</dt><dd>{row.displayId ?? 'সেন্ট্রাল পরিচয় অসম্পূর্ণ'}</dd>
      <dt>স্থায়ী ID</dt><dd>{row.orbisIdentityId ?? 'তথ্য নেই'}</dd>
      <dt>ইমেল</dt><dd>{row.email ?? 'তথ্য নেই'}</dd><dt>ফোন</dt><dd>{row.phone ?? 'তথ্য নেই'}</dd>
      <dt>Account status</dt><dd>{row.status}</dd><dt>অ্যাকাউন্ট তৈরি</dt><dd>{time(row.registeredAt)}</dd>
      <dt>শেষ কেন্দ্রীয় sign-in</dt><dd>{time(row.lastSignInAt)}</dd></dl>
    <p>সংযুক্ত অ্যাপ — ব্যবহার বা premium-এর প্রমাণ নয়</p>
    {row.products.length ? <ul>{row.products.map(product => <li key={product.projectId + ':' + product.environment}>
      <Link to={'/operations?project=' + encodeURIComponent(product.projectId)}>{product.projectId}</Link> · {product.environment}
    </li>)}</ul> : <p>কোনো অ্যাপের সংযোগ পাওয়া যায়নি।</p>}
  </article>
}
export function CustomerOperations({ load = loadOwnerAuth }: Readonly<{ load?: () => Promise<OwnerAuth | null> }>) {
  const [params] = useSearchParams(), query = params.toString()
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
  const scope = params.get('project'), customer = params.get('customer')
  let title = 'কাস্টমার ও অ্যাপের ব্যবহার'
  if (scope) title = scope + ' · অ্যাপের ব্যবহার'
  else if (customer) title = 'কাস্টমারের বিস্তারিত'
  const next = new URLSearchParams(params)
  if (data?.nextCursor) next.set('after', data.nextCursor)
  return <main className="customer-operations" aria-labelledby="operations-title">
    <nav aria-label="Operations navigation"><Link to="/">Admin হোম</Link><Link to="/operations">সেন্ট্রাল গ্রাহক</Link><Link to="/operations?project=orbis-khata">ORBIS Khata</Link><Link to="/customers">গ্রাহকদের পরিচয় তালিকা</Link></nav>
    <header><p className="kicker">ORBIS ADMIN · READ ONLY</p><h1 id="operations-title">{title}</h1>
      <p>সেন্ট্রাল পরিচয় ও login কার্যকলাপ। খাতার হিসাব এখানে পরিবর্তন করা হয় না।</p></header>
    <div className="ops-actions"><button type="button" disabled={busy} onClick={() => setAttempt(value => value + 1)}>আবার যাচাই করুন</button>
      {auth ? <button type="button" disabled={busy} onClick={() => { void signIn() }}>Admin লগইন</button> : null}</div>
    {message ? <output>{message}</output> : null}
    {data ? <>
      <p>পরীক্ষার সময়: {time(data.checkedAt)}</p>
      <dl className="ops-summary"><dt>এই scope-এর account</dt><dd>{data.total}</dd><dt>সেন্ট্রাল পরিচয় অসম্পূর্ণ</dt><dd>{data.unlinked}</dd></dl>
      <section aria-label="Storage ও subscription"><h2>Storage ও premium</h2><p>Database MB, file MB, কোম্পানি/বিলের সংখ্যা ও premium status: তথ্য সংযোগ করা হয়নি। শূন্য বা free ধরে নেওয়া হচ্ছে না।</p></section>
      <section aria-label="Customer accounts"><h2>গ্রাহক</h2>{data.customers.length ? data.customers.map(row => <CustomerRow key={row.authUserId} row={row} />) : <p>এই scope-এ কোনো account পাওয়া যায়নি।</p>}
        {data.nextCursor ? <Link className="ops-next" to={'/operations?' + next.toString()}>পরের ৫০ জন</Link> : null}
        {params.has('after') ? <Link to={'/operations?' + new URLSearchParams([...params].filter(([key]) => key !== 'after')).toString()}>প্রথম পাতা</Link> : null}
      </section>
      <section aria-label="Login activity"><h2>Login কার্যকলাপ · গত ২৪ ঘণ্টার সর্বশেষ ৫০টি</h2>
        <p>রেকর্ডিং চালু হওয়ার পর Admin দিয়ে সম্পন্ন login/signup request। পুরোনো ব্যর্থ চেষ্টা, session refresh বা পেজ খুলেই বন্ধ করা এতে নেই। ব্যর্থ চেষ্টার পরিচয় নিশ্চিত নয়। অ্যাপের নাম origin থেকে পাওয়া hint, access-এর প্রমাণ নয়।</p>
        {data.activity.length ? <ol className="ops-activity">{data.activity.map(event => <li key={event.id}>
          <strong>{event.action} · {event.outcome}</strong><span>{time(event.at)} · {event.durationMs} ms</span><span>{event.projectId ?? 'অ্যাপ অজানা'} · {event.code}</span>
          <span>{event.orbisIdentityId ?? 'পরিচয় অজানা'} · reference: {event.id}</span>
        </li>)}</ol> : <p>এই সময় ও scope-এ সংরক্ষিত request পাওয়া যায়নি। এটি কোনো চেষ্টা হয়নি তার নিশ্চয়তা নয়।</p>}
      </section>
    </> : null}
  </main>
}
