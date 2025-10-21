#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const isCheck = args.includes('--check')
const passthrough = args.filter(arg => arg !== '--check')
const prettierArgs = [
  'prettier',
  '--ignore-unknown',
  ...(isCheck ? ['--check'] : ['--write']),
  '.',
  ...passthrough,
]

const result = spawnSync('pnpm', prettierArgs, { stdio: 'inherit', shell: false })

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

process.exit(result.status ?? 1)
