import { cp, readdir, rename, rm } from 'node:fs/promises'

import path from 'node:path'

/**
 * Move all files from `${dirPath}/templates` directory to `${dirPath}` and delete
 * everything else that didn't come from it.
 *
 * @param dirPath
 */
export async function mountTemplatesDir (dirPath: string) {
  const templatesDir = path.join(dirPath, 'templates')

  const existingEntries = await readdir(dirPath)

  await cp(templatesDir, dirPath, { recursive: true })

  await Promise.all(
    existingEntries
      .filter(entry => entry !== 'templates')
      .map(entry => rm(path.join(dirPath, entry), { recursive: true, force: true }))
  )

  await rm(templatesDir, { recursive: true, force: true })
}

/**
 * Removes all files in dirPath except the one specified by keepFileName
 *
 * @param dirPath
 * @param keepFileName
 */
export async function cleanDirectoryExcept (dirPath: string, keepFileName: string) {
  const files = await readdir(dirPath)

  for (const file of files) {
    if (file === keepFileName) continue

    const fullPath = path.join(dirPath, file)

    await rm(fullPath, { recursive: true, force: true })
  }
}

/**
 * Moves all files from dirPath to parent directory and removes dirPath
 *
 * @param dirPath
 * @param parent
 */
export async function hoistDirectoryContents (parent: string, dirPath: string) {
  const source = path.isAbsolute(dirPath) ? dirPath : path.join(process.cwd(), dirPath)

  const targetParent = path.isAbsolute(parent) ? parent : path.join(process.cwd(), parent)

  if (!source.startsWith(targetParent)) {
    throw new Error('Source must be inside the parent directory')
  }

  const entries = await readdir(source)

  for (const entry of entries) {
    const from = path.join(source, entry)
    const to = path.join(targetParent, entry)

    await rename(from, to)
  }

  await rm(source, { recursive: true })
}
