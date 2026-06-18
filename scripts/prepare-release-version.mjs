import { readFile, readdir, writeFile } from 'node:fs/promises'

import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import yaml from 'js-yaml'

const versionArg = process.argv[2]
const version = normalizeVersion(versionArg)

const packageJsonPaths = [
  'package.json',
  'create-arkstack/package.json',
  'templates/express/package.json',
  'templates/h3/package.json',
  ...(await packagePaths('packages')),
]

for (const path of packageJsonPaths) {
  const source = await readFile(path, 'utf8')
  const pkg = JSON.parse(source)
  const indent = source.match(/^\s+"name"/m)?.[0].match(/^\s+/)?.[0] ?? '  '
  pkg.version = version
  await writeFile(path, `${JSON.stringify(pkg, null, indent)}\n`)
}

const dataPath = 'create-arkstack/src/data.ts'
const data = await readFile(dataPath, 'utf8')
await writeFile(
  dataPath,
  data.replace(/('@arkstack\/[^']+': )'\^[^']+'/g, `$1'^${version}'`),
)

try {
  const doc = yaml.load(readFileSync('pnpm-workspace.yaml', 'utf8'))
  let updatedData = data

  for (const [name, version] of Object.entries(doc.catalog ?? {})) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    updatedData = updatedData.replace(
      new RegExp(`('${escapedName}'\\s*:\\s*)'[^']+'`, 'g'),
      `$1'${version}'`
    )
  }
  await writeFile(dataPath, updatedData)
} catch (e) {
  console.log(e)
}

console.log(`Prepared Arkstack packages for ${version}`)

async function packagePaths (directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(directory, entry.name, 'package.json'))
}

function normalizeVersion (rawVersion) {
  const normalized = rawVersion?.trim().replace(/^v/, '')

  if (!normalized) {
    throw new Error('Usage: pnpm prepare:release-version <version>')
  }

  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(normalized)) {
    throw new Error(`Invalid semver version: ${rawVersion}`)
  }

  return normalized
}
