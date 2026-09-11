import type { ProjectRegistryResponse } from '@orbis-admin/contracts'

export type RegistryLoader = () => Promise<ProjectRegistryResponse>

type UnknownRecord = Record<string, unknown>

const asRecord = (value: unknown): UnknownRecord => {
  if (typeof value !== 'object') {
    throw new Error('Invalid project registry response: expected object')
  }

  if (value === null) {
    throw new Error('Invalid project registry response: expected object')
  }

  return value as UnknownRecord
}

export const parseProjectRegistryResponse = (
  value: unknown,
): ProjectRegistryResponse => {
  const record = asRecord(value)

  if (record.schemaVersion !== 'v1') {
    throw new Error('Invalid project registry response: schemaVersion')
  }

  if (typeof record.generatedAt !== 'string') {
    throw new Error('Invalid project registry response: generatedAt')
  }

  if (!Array.isArray(record.projects)) {
    throw new Error('Invalid project registry response: projects')
  }

  return value as ProjectRegistryResponse
}

export const loadProjectRegistry = async (
  fetcher: typeof fetch = fetch,
): Promise<ProjectRegistryResponse> => {
  const response = await fetcher('/api/v1/projects', {
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Project registry request failed: ${response.status}`)
  }

  return parseProjectRegistryResponse(await response.json())
}
