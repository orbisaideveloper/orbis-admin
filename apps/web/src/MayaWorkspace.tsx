import { useEffect, useState } from 'react'
import { parseMayaWorkspace, type MayaWorkspace as Workspace } from '@orbis-admin/contracts'
import { MayaControls } from './MayaControls'

export const loadMayaWorkspace = async (): Promise<Workspace> => {
  const response = await fetch('/api/v1/projects/orbis-maya/workspace', {
    headers: { accept: 'application/json' }, cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error('Maya workspace unavailable')
  return parseMayaWorkspace(await response.json())
}

export const MayaWorkspace = ({ load = loadMayaWorkspace }: {
  load?: () => Promise<Workspace>
}) => {
  const [data, setData] = useState<Workspace | null>(null)
  const [failed, setFailed] = useState(false)
  const [selected, setSelected] = useState<'publicUrl' | 'developmentUrl'>('developmentUrl')
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    const refresh = async () => {
      try {
        const next = await load()
        if (active) { setData(next); setFailed(false) }
      } catch {
        if (active) setFailed(true)
      } finally {
        if (active) timer = setTimeout(() => { void refresh() }, 60_000)
      }
    }
    void refresh()
    return () => { active = false; clearTimeout(timer) }
  }, [load])
  const viewUrl = data?.[selected]
  let statusMessage = 'তথ্য সংগ্রহ হচ্ছে…'
  if (data) statusMessage = 'প্রতি মিনিটে source তথ্য আপডেট হয়।'
  if (failed) statusMessage = 'আপডেট পাওয়া যায়নি। প্রদর্শিত তথ্য পুরোনো হতে পারে।'
  return (
    <section className="detail-panel maya-workspace" aria-label="Maya app views">
      <h2>মায়া — অ্যাপ ও সংস্করণ</h2>
      <output aria-live="polite">{statusMessage}</output>
      <div className="page-nav-buttons">
        {(['publicUrl', 'developmentUrl'] as const).map((key) => (
          <button key={key} type="button" disabled={!data?.[key]}
            aria-pressed={selected === key} onClick={() => setSelected(key)}>
            {key === 'publicUrl' ? 'Published view' : 'Development view'}
          </button>
        ))}
      </div>
      {viewUrl ? <>
        <a className="provider-link" href={viewUrl} target="_blank" rel="noopener noreferrer">পূর্ণ স্ক্রিনে খুলুন ↗</a>
        <iframe title="Maya app preview" src={viewUrl} loading="lazy"
          referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
      </> : <p>প্রকাশিত বা review URL যুক্ত হলে সংশ্লিষ্ট view চালু হবে। ফোনের localhost এখানে খোলা যায় না।</p>}
      <details className="maya-workspace-tools">
        <summary>সংস্করণ, যাচাই ও owner controls</summary>
      {data ? <dl>
        <dt>Source version</dt><dd>{data.version ?? 'সংযুক্ত নয়'}</dd>
        <dt>Main revision</dt><dd>{data.revision ?? 'সংযুক্ত নয়'}</dd>
        <dt>শেষ যাচাই</dt><dd>{data.checkedAt}</dd>
      </dl> : null}
      <p>Source version প্রকাশিত release বা AI সংযোগের প্রমাণ নয়। Published release development থেকে আলাদা deploy target-এ থাকবে; explicit publish ছাড়া বদলাবে না।</p>
      <a className="provider-link" href="https://github.com/orbisaideveloper/orbis-maya/actions"
        target="_blank" rel="noopener noreferrer">Maya checks ও release workflow ↗</a>
      <MayaControls />
      </details>
    </section>
  )
}
