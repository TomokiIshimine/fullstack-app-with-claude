#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)

const result = spawnSync('pnpm', ['vitest', 'run', ...args], {
  stdio: 'inherit',
  shell: false,
})

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

process.exit(result.status ?? 1)
