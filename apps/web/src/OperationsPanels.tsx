import { Link } from 'react-router-dom'
import type { CustomerObservability, CustomerUsage, LoginActivity } from '@orbis-admin/contracts'

const time = (value: string | null) => value === null ? 'তথ্য নেই' : new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
function destination(params: URLSearchParams, view: string) {
  const next = new URLSearchParams(params)
  next.delete('after'); next.delete('customer'); next.delete('page'); next.set('view', view)
  return '/operations?' + next.toString()
}
function CustomerDetails({ row }: Readonly<{ row: CustomerUsage }>) {
  return <section aria-label="গ্রাহকের বিস্তারিত"><h2>{row.name}</h2><dl className="ops-details">
    <dt>ইমেল</dt><dd>{row.email ?? 'তথ্য নেই'}</dd><dt>Orbis ID</dt><dd>{row.displayId ?? 'সেন্ট্রাল পরিচয় অসম্পূর্ণ'}</dd>
    <dt>স্থায়ী ID</dt><dd>{row.orbisIdentityId ?? 'তথ্য নেই'}</dd><dt>ফোন</dt><dd>{row.phone ?? 'তথ্য নেই'}</dd>
    <dt>অবস্থা</dt><dd>{row.status}</dd><dt>অ্যাকাউন্ট তৈরি</dt><dd>{time(row.registeredAt)}</dd>
    <dt>শেষ কেন্দ্রীয় লগইন</dt><dd>{time(row.lastSignInAt)}</dd></dl>
    <h3>সংযুক্ত অ্যাপ</h3>{row.products.length ? <ul>{row.products.map(product => <li key={product.projectId + ':' + product.environment}>{product.projectId} · {product.environment}</li>)}</ul> : <p>কোনো অ্যাপের সংযোগ পাওয়া যায়নি।</p>}
  </section>
}
function LoginTable({ events, customers }: Readonly<{ events: LoginActivity[]; customers: CustomerUsage[] }>) {
  return <div className="ops-table-wrap" tabIndex={0} role="region" aria-label="লগইন তালিকা"><table className="ops-table"><thead><tr><th scope="col">ক্রম</th><th scope="col">সময়</th><th scope="col">পরিচয়</th><th scope="col">ফলাফল</th></tr></thead>
    <tbody>{events.map((event, index) => {
      const customer = customers.find(row => row.orbisIdentityId !== null && row.orbisIdentityId === event.orbisIdentityId)
      return <tr key={event.id}><td>{index + 1}</td><td>{time(event.at)}</td><td>{customer ? <>{customer.name}<small>{customer.email ?? 'তথ্য নেই'}</small></> : 'পরিচয় অজানা'}<small>{event.orbisIdentityId ?? 'নিশ্চিত পরিচয় পাওয়া যায়নি'}</small></td><td>{event.code}<small>{event.durationMs} ms</small></td></tr>
    })}</tbody></table></div>
}
export function OperationsPanels({ data, params }: Readonly<{ data: CustomerObservability; params: URLSearchParams }>) {
  const view = params.get('view'), selected = params.get('customer')
  const cards = [
    { view: 'customers', title: 'মোট গ্রাহক', count: data.total, note: 'সংযুক্ত গ্রাহকের তালিকা' },
    { view: 'success', title: 'সফল লগইন', count: data.loginTotals.success, note: 'গত ২৪ ঘণ্টা · লগইন সংখ্যা' },
    { view: 'failure', title: 'ব্যর্থ লগইন', count: data.loginTotals.failure, note: 'গত ২৪ ঘণ্টা · লগইন সংখ্যা' },
  ]
  const isCustomers = view === 'customers'
  const isLogin = view === 'success' || view === 'failure'
  const row = data.customers.find(customer => customer.authUserId === selected)
  const next = new URLSearchParams(params)
  if (data.nextCursor) { next.set('after', data.nextCursor); next.set('page', String(Number(params.get('page') ?? 0) + 1)) }
  const first = new URLSearchParams(params); first.delete('after'); first.delete('page')
  const page = Number(params.get('page') ?? 0)
  const start = Number.isSafeInteger(page) && page >= 0 && page < 1_000_000 ? page * 50 : 0
  const events = data.activity.filter(event => event.action === 'login' && event.outcome === view)
  return <>
    {view || selected ? <Link className="ops-back" to={destination(params, selected ? 'customers' : 'overview')}>← {selected ? 'গ্রাহক তালিকা' : 'ড্যাশবোর্ড'}</Link> : null}
    {!selected && !isCustomers && !isLogin ? <>
      <div className="ops-cards" aria-label="গ্রাহক ও লগইন সারাংশ">{cards.map(card => <Link key={card.view} className={'ops-stat ops-stat--' + card.view} to={destination(params, card.view)}><span>{card.title}</span><strong>{card.count}</strong><small>{card.note}</small><span className="ops-card-action">তালিকা দেখুন →</span></Link>)}</div>
      {data.unlinked > 0 ? <p className="ops-notice">{data.unlinked}টি গ্রাহকের সেন্ট্রাল পরিচয় অসম্পূর্ণ।</p> : null}
      <p className="ops-muted">গ্রাহকসংখ্যা ও লগইন সংখ্যা আলাদা। এটি বর্তমানে অনলাইনে থাকা মানুষের সংখ্যা নয়।</p>
    </> : null}
    {selected ? row ? <CustomerDetails row={row}/> : <p>গ্রাহকের তথ্য পাওয়া যায়নি।</p> : null}
    {isCustomers && !selected ? <section aria-label="Customer accounts"><h2>গ্রাহক তালিকা <span className="ops-count">{data.total}</span></h2>
      {data.customers.length ? <div className="ops-table-wrap" tabIndex={0} role="region" aria-label="গ্রাহক তালিকা"><table className="ops-table"><thead><tr><th scope="col">ক্রম</th><th scope="col">নাম</th><th scope="col">ইমেল</th><th scope="col">Orbis ID</th></tr></thead><tbody>{data.customers.map((customer, index) => {
        const detail = new URLSearchParams(params); detail.delete('after'); detail.delete('page'); detail.set('customer', customer.authUserId)
        return <tr key={customer.authUserId}><td>{start + index + 1}</td><td><Link to={'/operations?' + detail.toString()}>{customer.name}</Link></td><td>{customer.email ?? 'তথ্য নেই'}</td><td>{customer.displayId ?? 'সেন্ট্রাল পরিচয় অসম্পূর্ণ'}</td></tr>
      })}</tbody></table></div> : <p>এই অ্যাপে সংযুক্ত গ্রাহক পাওয়া যায়নি।</p>}
      <div className="ops-pagination">{data.nextCursor ? <Link to={'/operations?' + next.toString()}>পরের ৫০ জন →</Link> : null}{params.has('after') ? <Link to={'/operations?' + first.toString()}>প্রথম পাতা</Link> : null}</div>
    </section> : null}
    {isLogin && !selected ? <section aria-label="Login activity"><h2>{view === 'success' ? 'সফল লগইন' : 'ব্যর্থ লগইন'}</h2><p className="ops-muted">গত ২৪ ঘণ্টায় {data.loginTotals[view]}টি। এই ফলাফলের সর্বশেষ ৫০টি request দেখানো হয়।</p>
      {events.length ? <LoginTable events={events} customers={data.customers}/> : <p>এই সময়ে সংরক্ষিত লগইন পাওয়া যায়নি।</p>}
      <details className="ops-note"><summary>এই তথ্য সম্পর্কে</summary><p>রেকর্ডিং চালু হওয়ার পর Admin দিয়ে সম্পন্ন লগইন request। Signup, session refresh ও পেজ খুলেই বন্ধ করা এই সংখ্যায় নেই। ব্যর্থ চেষ্টার পরিচয় নিশ্চিত নয়। অ্যাপের নাম origin থেকে পাওয়া hint; অ্যাপ ব্যবহারের প্রমাণ নয়। পুরোনো ব্যর্থ চেষ্টা এখানে নেই।</p></details>
    </section> : null}
  </>
}
