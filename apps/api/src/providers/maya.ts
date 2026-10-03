import { safeProductUrl, type MayaWorkspace } from '@orbis-admin/contracts'

type MayaReaderOptions = {
  fetchImpl?: typeof fetch
  token?: string
  publicUrl?: string
  developmentUrl?: string
  now?: () => Date
}

const recordOf = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null
    ? value as Record<string, unknown> : {}

export const createMayaWorkspaceReader = ({
  fetchImpl = fetch, token, publicUrl, developmentUrl,
  now = () => new Date(),
}: MayaReaderOptions = {}) => {
  const readFresh = async (): Promise<MayaWorkspace> => {
  const result: MayaWorkspace = {
    schemaVersion: 'maya.workspace.v1', projectId: 'orbis-maya',
    checkedAt: now().toISOString(), revision: null, version: null,
    publicUrl: safeProductUrl(publicUrl),
    developmentUrl: safeProductUrl(developmentUrl),
  }
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json', 'User-Agent': 'orbis-admin-readonly',
  }
  if (token?.trim()) headers.Authorization = `Bearer ${token.trim()}`
  let stage = 'branch'
  let httpStatus: number | null = null
  const read = async (path: string): Promise<unknown> => {
    const response = await fetchImpl(
      `https://api.github.com/repos/orbisaideveloper/orbis-maya/${path}`,
      { headers, redirect: 'error', signal: AbortSignal.timeout(8_000) },
    )
    httpStatus = response.status
    if (!response.ok) throw new Error('Maya source unavailable')
    const body = await response.text()
    if (body.length > 65_536) throw new Error('Maya metadata exceeds limit')
    return JSON.parse(body) as unknown
  }
  try {
    const branch = recordOf(await read('branches/main'))
    const revision = recordOf(branch.commit).sha
    if (typeof revision !== 'string' || !/^[a-f0-9]{40}$/.test(revision)) return result
    result.revision = revision
    stage = 'package'
    httpStatus = null
    headers.Accept = 'application/vnd.github.raw+json'
    const pkg = recordOf(await read(`contents/package.json?ref=${revision}`))
    if (pkg.name === 'orbis-maya' && typeof pkg.version === 'string' && pkg.version.length <= 80) {
      result.version = pkg.version
    }
  } catch {
    console.warn('Maya source metadata unavailable', { stage, httpStatus })
    // Log only bounded non-secret diagnostics; never remote bodies or credentials.
  }
  return result
}
  let cached: Promise<MayaWorkspace> | null = null
  let expiresAt = 0
  return (): Promise<MayaWorkspace> => {
    const timestamp = now().getTime()
    if (cached === null || timestamp >= expiresAt) {
      expiresAt = timestamp + 60_000
      cached = readFresh()
    }
    return cached
  }
}
