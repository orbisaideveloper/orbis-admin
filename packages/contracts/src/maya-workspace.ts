export type MayaWorkspace = {
  schemaVersion: 'maya.workspace.v1'
  projectId: 'orbis-maya'
  checkedAt: string
  revision: string | null
  version: string | null
  publicUrl: string | null
  developmentUrl: string | null
}

export const safeProductUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' || url.username || url.password ||
      url.hostname === 'localhost' || url.hostname.endsWith('.localhost') ||
      url.hostname.includes(':') || /^[\d.]+$/.test(url.hostname)
    ) return null
    return url.href
  } catch {
    return null
  }
}

export const parseMayaWorkspace = (value: unknown): MayaWorkspace => {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('Invalid Maya workspace')
  }
  const record = value as Record<string, unknown>
  if (
    record.schemaVersion !== 'maya.workspace.v1' ||
    record.projectId !== 'orbis-maya' ||
    typeof record.checkedAt !== 'string' ||
    !Number.isFinite(Date.parse(record.checkedAt))
  ) throw new TypeError('Invalid Maya workspace contract')
  for (const key of ['revision', 'version', 'publicUrl', 'developmentUrl']) {
    if (record[key] !== null && typeof record[key] !== 'string') {
      throw new TypeError('Invalid Maya workspace field')
    }
  }
  if (
    (record.revision !== null && !/^[a-f0-9]{40}$/.test(record.revision as string)) ||
    (record.version !== null && (record.version as string).length > 80)
  ) throw new TypeError('Invalid Maya source metadata')
  for (const key of ['publicUrl', 'developmentUrl']) {
    if (record[key] !== null && safeProductUrl(record[key]) === null) {
      throw new TypeError('Invalid Maya view URL')
    }
  }
  return {
    schemaVersion: 'maya.workspace.v1', projectId: 'orbis-maya',
    checkedAt: record.checkedAt, revision: record.revision as string | null,
    version: record.version as string | null,
    publicUrl: record.publicUrl as string | null,
    developmentUrl: record.developmentUrl as string | null,
  }
}
