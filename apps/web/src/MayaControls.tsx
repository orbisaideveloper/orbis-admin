import { useEffect, useState } from 'react'
import { loadOwnerAuth, type OwnerAuth } from './owner-auth'

type Prepared = { confirmation: string; revision: string; actionId: string }
const request = async (auth: OwnerAuth, path: string, body?: unknown): Promise<unknown> => {
  const token = await auth.token()
  if (!token) throw new Error('OWNER_LOGIN_REQUIRED')
  const response = await fetch(`/api/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST', cache: 'no-store',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error('OWNER_CONTROL_UNAVAILABLE')
  return response.json()
}

export const MayaControls = ({ load = loadOwnerAuth }: { load?: () => Promise<OwnerAuth | null> }) => {
  const [auth, setAuth] = useState<OwnerAuth | null>(null)
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [revision, setRevision] = useState('')
  const [prepared, setPrepared] = useState<Prepared | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Owner account যাচাই হচ্ছে…')
  const [audit, setAudit] = useState<unknown>(null)
  useEffect(() => {
    let active = true
    let current: OwnerAuth | null = null
    void (async () => {
      try {
        const client = await load()
        if (!active) { client?.dispose(); return }
        current = client
        setAuth(client)
        if (!client) { setMessage('Owner login এখনো configure করা হয়নি।'); return }
        if (!(await client.token())) { setMessage('Controls ব্যবহার করতে owner login করুন।'); return }
        const owner = await request(client, 'admin/session')
        if (!owner || typeof owner !== 'object' || !('capabilities' in owner) ||
          !Array.isArray(owner.capabilities) || !owner.capabilities.every((item: unknown) => typeof item === 'string')) {
          throw new Error('Invalid owner session')
        }
        if (active) { setCapabilities(owner.capabilities); setMessage('Owner session যাচাই হয়েছে।') }
      } catch { if (active) setMessage('Owner login বা permission যাচাই হয়নি। আবার চেষ্টা করুন।') }
    })()
    return () => { active = false; current?.dispose() }
  }, [load])
  const perform = async (operation: () => Promise<void>) => {
    setBusy(true)
    try { await operation() } catch {
      setPrepared(null)
      setMessage('কাজ নিশ্চিত হয়নি। Audit ও provider status যাচাই করুন; deploy আবার পাঠাবেন না।')
    } finally { setBusy(false) }
  }
  const canDeploy = capabilities.includes('orbis-maya:development:development.deploy')
  const canAudit = capabilities.includes('orbis-maya:development:audit.read')
  return <section className="detail-panel" aria-label="Maya owner controls">
    <h2>মায়া — Owner controls</h2>
    <p role="status">{message}</p>
    {auth ? <div className="page-nav-buttons">
      <button type="button" disabled={busy} onClick={() => { void perform(() => auth.login()) }}>Google দিয়ে owner login</button>
      <button type="button" disabled={busy} onClick={() => {
        setCapabilities([]); setPrepared(null); setAudit(null)
        void perform(async () => { await auth.logout(); setMessage('Owner session বন্ধ হয়েছে।') })
      }}>Logout</button>
    </div> : null}
    <label>যাচাই করা Maya main commit SHA
      <input value={revision} maxLength={40} onChange={(event) => { setRevision(event.target.value); setPrepared(null) }} />
    </label>
    <button type="button" disabled={busy || !canDeploy || !/^[0-9a-f]{40}$/.test(revision)} onClick={() => {
      void perform(async () => {
        const result = await request(auth!, 'projects/orbis-maya/deploy/prepare', { revision })
        if (!result || typeof result !== 'object' || !('confirmation' in result) || !('actionId' in result) ||
          typeof result.confirmation !== 'string' || typeof result.actionId !== 'string') throw new Error('Invalid confirmation')
        setPrepared({ confirmation: result.confirmation, actionId: result.actionId, revision })
        setMessage('নিচের exact commit শুধু Development view-তে deploy হবে। নিশ্চিত করুন।')
      })
    }}>Development deploy প্রস্তুত করুন</button>
    {prepared ? <div>
      <p>Development commit: <code>{prepared.revision}</code></p>
      <button type="button" disabled={busy} onClick={() => {
        const action = prepared; setPrepared(null)
        void perform(async () => {
          const result = await request(auth!, 'projects/orbis-maya/deploy/execute', { confirmation: action.confirmation })
          if (!result || typeof result !== 'object' || !('state' in result) || result.state !== 'accepted' ||
            !('actionId' in result) || result.actionId !== action.actionId || !('deployId' in result) ||
            typeof result.deployId !== 'string' || !/^dep-[a-z0-9]+$/.test(result.deployId)) {
            throw new Error('Unverified deployment acknowledgement')
          }
          setMessage(`Deploy request গ্রহণ করা হয়েছে। Action: ${action.actionId}। LIVE status আলাদা করে যাচাই করতে হবে।`)
        })
      }}>এই development deploy নিশ্চিত করুন</button>
      <button type="button" disabled={busy} onClick={() => setPrepared(null)}>বাতিল করুন</button>
    </div> : null}
    <button type="button" disabled={busy || !canAudit} onClick={() => {
      void perform(async () => {
        const result = await request(auth!, 'projects/orbis-maya/audit')
        if (!Array.isArray(result)) throw new Error('Invalid audit response')
        setAudit(result); setMessage('Audit আপডেট হয়েছে।')
      })
    }}>Audit দেখুন</button>
    {audit ? <pre aria-label="Maya action audit">{JSON.stringify(audit, null, 2)}</pre> : null}
    <p>Public release বন্ধ আছে। Approved release ও production verification ছাড়া publish করা যাবে না।</p>
  </section>
}
