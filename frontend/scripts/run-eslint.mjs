#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const cwd = process.cwd()

const normalizePath = input => {
  let candidate = input
  if (candidate.startsWith('frontend/')) {
    candidate = candidate.slice('frontend/'.length)
  } else if (candidate.startsWith('./frontend/')) {
    candidate = candidate.slice('./frontend/'.length)
  }

  const resolved = path.resolve(cwd, candidate)
  if (!resolved.startsWith(cwd) || !existsSync(resolved)) {
    return null
  }

  return path.relative(cwd, resolved)
}

const rawArgs = process.argv.slice(2)
const files = Array.from(new Set(rawArgs.map(normalizePath).filter(Boolean)))

if (files.length === 0) {
  process.exit(0)
}

const eslintArgs = ['eslint', '--max-warnings=0', '--fix', ...files]
const result = spawnSync('pnpm', eslintArgs, { stdio: 'inherit', shell: false })

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

process.exit(result.status ?? 1)
