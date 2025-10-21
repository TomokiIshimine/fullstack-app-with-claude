#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const runInBand = args.includes('--runInBand')
const passthrough = args.filter(arg => arg !== '--runInBand')
const vitestArgs = [
  'vitest',
  '--run',
  '--pool=threads',
  '--poolOptions.threads.singleThread=true',
  ...(runInBand ? [] : []),
  ...passthrough,
]

const result = spawnSync('pnpm', vitestArgs, {
  stdio: 'inherit',
  shell: false,
})

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

process.exit(result.status ?? 1)
