import type {
  GitHubRegistration,
  SignalState,
} from '@orbis-admin/contracts'

type GitHubFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>

type GitHubReaderOptions = {
  fetchImpl?: GitHubFetch
  token?: string
  apiBaseUrl?: string
}

export type GitHubReadState = {
  repositoryFullName: string
  branch: string
  headSha: string | null
  ci: SignalState
}

type GitHubCheckRun = {
  status: string
  conclusion: string | null
}

const repositoryFullNamePattern =
  /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

const healthyCheckConclusions = new Set([
  'success',
  'neutral',
  'skipped',
])

const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)

const branchHeadSha = (payload: unknown): string | null => {
  if (!isRecord(payload) || !isRecord(payload.commit)) {
    return null
  }

  return typeof payload.commit.sha === 'string'
    ? payload.commit.sha
    : null
}

const checkRunsFromPayload = (
  payload: unknown,
): GitHubCheckRun[] | null => {
  if (!isRecord(payload) || !Array.isArray(payload.check_runs)) {
    return null
  }

  const runs: GitHubCheckRun[] = []

  for (const candidate of payload.check_runs) {
    if (
      !isRecord(candidate) ||
      typeof candidate.status !== 'string' ||
      !(
        candidate.conclusion === null ||
        typeof candidate.conclusion === 'string'
      )
    ) {
      return null
    }

    runs.push({
      status: candidate.status,
      conclusion: candidate.conclusion,
    })
  }

  return runs
}

const ciSignalFromCheckRuns = (
  runs: GitHubCheckRun[],
): SignalState => {
  if (runs.length === 0) {
    return 'unknown'
  }

  if (runs.some((run) => run.status !== 'completed')) {
    return 'attention'
  }

  return runs.every(
    (run) =>
      run.conclusion !== null &&
      healthyCheckConclusions.has(run.conclusion),
  )
    ? 'healthy'
    : 'attention'
}

const fallbackState = (
  registration: GitHubRegistration,
): GitHubReadState => ({
  repositoryFullName: registration.repositoryFullName,
  branch: registration.defaultBranch,
  headSha: null,
  ci: 'unknown',
})

const githubHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'orbis-admin-readonly',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  const normalizedToken = token?.trim()
  if (normalizedToken) {
    headers.Authorization = `Bearer ${normalizedToken}`
  }

  return headers
}

export const createGitHubReader = ({
  fetchImpl = fetch,
  token,
  apiBaseUrl = 'https://api.github.com',
}: GitHubReaderOptions = {}) => {
  const baseUrl = apiBaseUrl.replace(/\/+$/, '')
  const headers = githubHeaders(token)

  return async (
    registration: GitHubRegistration,
  ): Promise<GitHubReadState> => {
    const fallback = fallbackState(registration)

    if (
      !repositoryFullNamePattern.test(
        registration.repositoryFullName,
      ) ||
      registration.defaultBranch.trim().length === 0
    ) {
      return fallback
    }

    const [owner, repository] =
      registration.repositoryFullName.split('/')

    try {
      const branchResponse = await fetchImpl(
        `${baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/branches/${encodeURIComponent(registration.defaultBranch)}`,
        { headers },
      )

      if (!branchResponse.ok) {
        return fallback
      }

      const headSha = branchHeadSha(
        await branchResponse.json(),
      )

      if (!headSha) {
        return fallback
      }

      const checksResponse = await fetchImpl(
        `${baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/commits/${encodeURIComponent(headSha)}/check-runs?per_page=100`,
        { headers },
      )

      if (!checksResponse.ok) {
        return {
          ...fallback,
          headSha,
        }
      }

      const checkRuns = checkRunsFromPayload(
        await checksResponse.json(),
      )

      if (!checkRuns) {
        return {
          ...fallback,
          headSha,
        }
      }

      return {
        repositoryFullName: registration.repositoryFullName,
        branch: registration.defaultBranch,
        headSha,
        ci: ciSignalFromCheckRuns(checkRuns),
      }
    } catch {
      return fallback
    }
  }
}
