import {
  readFileSync,
  readdirSync,
} from 'node:fs'
import { join } from 'node:path'

const directory = '.github/workflows'
const workflowFiles = readdirSync(directory)
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .sort()

const allowedTopLevel = new Set([
  'name',
  'run-name',
  'on',
  'permissions',
  'env',
  'defaults',
  'concurrency',
  'jobs',
])

const failures = []

for (const file of workflowFiles) {
  const path = join(directory, file)
  const text = readFileSync(path, 'utf8')
  const lines = text.split(/\r?\n/)

  const topLevelKeys = []
  let jobsLine = -1

  lines.forEach((line, index) => {
    if (line.includes('\t')) {
      failures.push(
        `${path}:${index + 1}: tabs are not allowed in workflow YAML`,
      )
    }

    const topMatch = line.match(
      /^([A-Za-z][A-Za-z0-9_-]*):(?:\s|$)/,
    )

    if (!topMatch) return

    const key = topMatch[1]
    topLevelKeys.push({ key, line: index + 1 })

    if (!allowedTopLevel.has(key)) {
      failures.push(
        `${path}:${index + 1}: unexpected top-level key "${key}". ` +
          `A job may have lost its required two-space indentation.`,
      )
    }

    if (key === 'jobs') {
      jobsLine = index
    }
  })

  for (const required of ['name', 'on', 'jobs']) {
    if (!topLevelKeys.some(({ key }) => key === required)) {
      failures.push(
        `${path}: missing required top-level "${required}" section`,
      )
    }
  }

  if (jobsLine >= 0) {
    const jobHeaders = []

    for (let i = jobsLine + 1; i < lines.length; i += 1) {
      const line = lines[i]

      if (
        line &&
        !line.startsWith(' ') &&
        !line.startsWith('#')
      ) {
        break
      }

      const jobMatch = line.match(
        /^  ([A-Za-z_][A-Za-z0-9_-]*):\s*(?:#.*)?$/,
      )

      if (jobMatch) {
        jobHeaders.push({
          id: jobMatch[1],
          index: i,
        })
      }
    }

    if (jobHeaders.length === 0) {
      failures.push(`${path}: jobs section contains no valid jobs`)
    }

    const seen = new Set()

    jobHeaders.forEach((job, position) => {
      if (seen.has(job.id)) {
        failures.push(
          `${path}:${job.index + 1}: duplicate job id "${job.id}"`,
        )
      }

      seen.add(job.id)

      const nextIndex =
        jobHeaders[position + 1]?.index ?? lines.length

      const block = lines.slice(job.index + 1, nextIndex)

      const hasExecutionTarget = block.some((line) =>
        /^    (runs-on|uses):/.test(line),
      )

      if (!hasExecutionTarget) {
        failures.push(
          `${path}:${job.index + 1}: job "${job.id}" ` +
            `has neither runs-on nor uses`,
        )
      }
    })
  }
}

if (workflowFiles.length === 0) {
  failures.push('No GitHub workflow files found')
}

if (failures.length > 0) {
  console.error('WORKFLOW VALIDATION: FAILED')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(
  `WORKFLOW VALIDATION: PASS — ${workflowFiles.length} workflow file(s)`,
)
