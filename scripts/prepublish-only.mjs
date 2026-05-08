import { spawnSync } from 'node:child_process'

if (process.env.CI) {
  console.log('Skipping prepublishOnly in CI.')
  process.exit(0)
}

const result = spawnSync('pnpm', ['build'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

process.exit(result.status ?? 1)
