import type { InertiaStackSpec, KitName } from './types'
import { Logger, Resolver } from '@h3ravel/shared'
import { catalog, catalogs } from './catalog'
import { copyFile, cp, mkdir, readFile, readdir, rm, unlink, writeFile } from 'node:fs/promises'
import { environment, filesToRemove, fullDependencies, leanDependencies } from './data'
import { findInertiaStack, sharedInertiaDeps, sharedInertiaFiles, transformInertiaStub } from './inertia'
import path, { basename, dirname, join, relative } from 'node:path'

import { Str } from '@h3ravel/support'
import { chdir } from 'node:process'
import { depsList } from './data'
import { detectPackageManager } from '@antfu/install-pkg'
import { downloadTemplate } from 'giget'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'

export default class {
  skipInstallation?: boolean
  packageJson: { [key: string]: any } = {}
  pkgPath?: string
  inertiaStubsDir?: string

  constructor(
    private location?: string,
    private appName?: string,
    private description?: string,
  ) {
    if (!this.location) {
      this.location = join(process.cwd(), '.temp')
    }
  }

  async pm() {
    return (await detectPackageManager()) ?? 'npm'
  }

  async runCmd(npx: boolean = false) {
    if (npx) return 'npx'

    const pm = await this.pm()

    return pm === 'npm' ? 'npm run' : pm
  }

  async download(template: string, install = false, auth?: string, overwrite = false) {
    if (this.location?.includes('.temp') || (overwrite && existsSync(this.location!))) {
      await rm(this.location!, { force: true, recursive: true })
    } else if (existsSync(this.location!)) {
      const files = await readdir(this.location ?? './')
      if (files?.length > 0) {
        console.log('\n')
        Logger.parse(
          [
            [' ERROR ', 'bgRed'],
            [this.location!, ['gray', 'italic']],
            ['is not empty.', 'white'],
          ],
          ' ',
        )
        console.log('')
        process.exit(0)
      }
    }

    this.skipInstallation = !install
    this.removeLockFile()

    const status = await downloadTemplate(template, {
      dir: this.location,
      auth,
      provider: 'github',
      registry: await this.pm(),
      forceClean: false,
    })

    return status
  }

  /**
   * Installs the project dependencies using the detected package manager. 
   * If a specific package name is provided, it will install that package 
   * instead of all dependencies.
   * 
   * @param name 
   * @param args 
   * @returns 
   */
  async installPackage(name?: string, args: string[] = []) {
    const bcmd = await Resolver.getPakageInstallCommand() + (name ? ` ${name}` : '')
    const cmd = bcmd?.split(' ')[0]
    if (bcmd.includes(' ')) {
      args.unshift(...bcmd.split(' ').slice(1))
    }

    const child = spawnSync(cmd, args, {
      cwd: this.location ?? process.cwd(),
      stdio: 'ignore',
    })

    if (child.error) {
      return child.status
    }

    return 0
  }

  async complete(install = false) {
    let installed = false
    if (install) {
      installed = await this.installPackage() === 0
    }

    console.log('')

    const installPath = './' + relative(process.cwd(), this.location!)

    try {
      chdir(path.join(process.cwd(), installPath))
    } catch {
      /** */
    }

    Logger.success('Your Arkstack project has been created successfully')
    Logger.parse(
      [
        ['cd', 'cyan'],
        [installPath, 'yellow'],
        installPath === process.cwd() ? ['✔', 'green'] : ['', 'green'],
      ],
      ' ',
    )

    if (!installed) {
      Logger.parse([[await Resolver.getPakageInstallCommand(), 'cyan']])
    }

    Logger.parse(
      [
        [await this.runCmd(), 'cyan'],
        ['dev', 'yellow'],
      ],
      ' ',
    )
    Logger.parse([
      ['Open', 'cyan'],
      ['http://localhost:3000', 'yellow'],
    ])

    console.log('')

    Logger.parse([['Have any questions', 'white']])
    Logger.parse([
      ['Join our Discord server -', 'white'],
      ['https://discord.gg/jmQybxKQ7R', 'yellow'],
    ])
    Logger.parse([
      ['Checkout our other projects -', 'white'],
      ['https://toneflix.net/open-source', 'yellow'],
    ])
  }

  async removeLockFile() {
    if (!this.skipInstallation) {
      return
    }

    await Promise.allSettled([
      unlink(join(this.location!, 'package-lock.json')),
      unlink(join(this.location!, 'yarn.lock')),
      unlink(join(this.location!, 'pnpm-lock.yaml')),
    ])
  }

  async getBanner() {
    return await readFile(join(process.cwd(), './logo.txt'), 'utf-8')
  }

  async createDotEnv(scope: 'min' | 'max' = 'max') {
    const envPath = join(this.location!, '.env')
    const exampleEnvPath = join(this.location!, '.env.example')

    const allowed = scope === 'max'
      ? [...environment.max, ...environment.min]
      : environment.min

    if (existsSync(exampleEnvPath)) {
      const env = await readFile(exampleEnvPath, 'utf-8')

      const kept: string[] = []
      for (const line of env.split(/\r?\n/)) {
        const trimmed = line.trim()
        const isBlank = trimmed === ''
        const isComment = trimmed.startsWith('#')

        // Drop disallowed variable lines outright (keep comments/blank lines).
        if (!isBlank && !isComment) {
          const key = line.split('=').at(0)?.trim() ?? ''
          if (!allowed.includes(key)) continue
        }

        // Collapse the runs of blank lines left behind by removed vars.
        if (isBlank && kept.at(-1)?.trim() === '') continue

        kept.push(line)
      }

      // Trim leading/trailing blank lines.
      while (kept.length && kept[0].trim() === '') kept.shift()
      while (kept.length && kept.at(-1)!.trim() === '') kept.pop()

      await writeFile(exampleEnvPath, kept.join('\n') + '\n')
      await copyFile(exampleEnvPath, envPath)
    }
  }

  async saveProfile() {
    if (this.pkgPath)
      await writeFile(this.pkgPath, JSON.stringify(this.packageJson, null, 2))
  }

  async makeProfile() {
    const pkgPath = join(this.location!, 'package.json')
    if (existsSync(pkgPath)) {
      this.pkgPath = pkgPath
      this.packageJson = await readFile(pkgPath, 'utf-8').then(JSON.parse)

      for (const [name] of Object.entries(this.packageJson.dependencies)) {
        if (/^@(arkstack|h3ravel)\//.test(name))
          delete this.packageJson.dependencies[name]
      }

      const deps = Object.fromEntries([
        ...Object.entries(depsList),
        ...Object.entries(this.packageJson.dependencies)
      ])

      this.packageJson.dependencies = deps

      await this.resolveCatalogDeps()
    } else this.packageJson = {}
  }

  /**
   * Replace any `catalog:` dependency specifiers with concrete version ranges.
   *
   * `catalog:` is a pnpm workspace protocol and is meaningless once the project
   * is scaffolded outside the monorepo. Each specifier is resolved from the
   * curated {@link depsList}, then the workspace catalog snapshot ({@link catalog}
   * / {@link catalogs}), and finally — as a defensive fallback — the npm registry.
   */
  async resolveCatalogDeps() {
    for (const field of ['dependencies', 'devDependencies'] as const) {
      const deps = this.packageJson[field] as Record<string, string> | undefined
      if (!deps) continue

      for (const [name, version] of Object.entries(deps)) {
        if (typeof version !== 'string' || !version.startsWith('catalog:')) {
          continue
        }

        const catalogName = version.slice('catalog:'.length).trim()
        deps[name] = await this.resolveCatalogVersion(name, catalogName)
      }
    }
  }

  /**
   * Resolve a single `catalog:` specifier to a concrete version range.
   *
   * @param name         The dependency name.
   * @param catalogName  The named catalog (empty string for the default catalog).
   */
  private async resolveCatalogVersion(name: string, catalogName: string): Promise<string> {
    const fromCatalog = catalogName
      ? catalogs[catalogName]?.[name]
      : catalog[name]

    const resolved = depsList[name] ?? fromCatalog

    if (resolved) {
      return resolved
    }

    const latest = await this.fetchLatestVersion(name)

    if (latest) {
      return `^${latest}`
    }

    Logger.parse(
      [
        [' WARN ', 'bgYellow'],
        [`Could not resolve a catalog version for "${name}"; using "latest".`, 'white'],
      ],
      ' ',
    )

    return 'latest'
  }

  /**
   * Look up a package's latest published version from the npm registry.
   *
   * @param name  The dependency name.
   * @returns     The version, or `undefined` when the lookup fails.
   */
  private async fetchLatestVersion(name: string): Promise<string | undefined> {
    try {
      const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`)

      if (!response.ok) {
        return undefined
      }

      const data = await response.json() as { version?: string }

      return data.version
    } catch {
      return undefined
    }
  }

  async makeFullProfile(_kit: KitName) {
    await this.makeProfile()
    if (!this.pkgPath) return

    for (const dep of leanDependencies) {
      delete this.packageJson.dependencies?.[dep]
      delete this.packageJson.devDependencies?.[dep]
    }
  }

  async makeLeanProfile(_kit: KitName) {
    await Promise.allSettled(
      filesToRemove.map((file) => rm(join(this.location!, file), { force: true, recursive: true })),
    )

    await this.makeProfile()

    if (this.pkgPath) {
      for (const dep of fullDependencies) {
        delete this.packageJson.dependencies?.[dep]
        delete this.packageJson.devDependencies?.[dep]
      }
    }

    const filesToPatch = [
      'src/core/app.ts',
      'src/core/router.ts',
      'src/core/bootstrap.ts',
    ]

    for (const file of filesToPatch) {
      const filePath = join(this.location!, file)

      if (!existsSync(filePath)) {
        continue
      }

      let content = await readFile(filePath, 'utf-8')
      content = content
        .replace(/import '@arkstack\/database\/setup'\s*/g, '')
        .replace(/import '@arkstack\/auth\/setup'\s*/g, '')
        .replace(/import '@arkstack\/queue\/setup'\s*/g, '')
        .replace(/import '@arkstack\/cache\/setup'\s*/g, '')
        .replace('import { ValidatorDBDriver } from \'@arkstack/database\'\n', '')
        .replace('import { ModelNotFoundException } from \'arkormx\'\n', '')
        .replace('import { prisma } from \'src/core/database\'\n', '')
        .replace('import { Prisma } from \'@prisma/client\'\n', '')
        .replace('Validator.useDatabase(new ValidatorDBDriver())', '')
        .replace('  async shutdown () {\n    await prisma.$disconnect()\n    process.exit(0)\n  }', '  async shutdown () {\n    process.exit(0)\n  }')
        .replace(
          ' * Shuts down the application by disconnecting from the database and exiting the process.',
          ' * Shuts down the application and exits the process.',
        )
        .replace(
          /\n\s*if \((?:err|cause) instanceof Prisma\.PrismaClientKnownRequestError && (?:err|cause)\.code === "P2025"\) \{\n\s*error\.code = 404\n\s*error\.message = `\$\{(?:err|cause)\.meta\?\.modelName\} not found!`\n\s*\}\n/g,
          '\n',
        )
        .replace(
          /\n\s*if \((?:err|cause) instanceof ModelNotFoundException\) \{\n\s*error\.code = 404\n\s*error\.message = `\$\{(?:err|cause)\.getModelName\(\)\} not found!`\n\s*\}\n/g,
          '\n',
        )
        .replace(
          /if \(!\(err instanceof ValidationException\) &&\n\s*!\(err instanceof ModelNotFoundException\)\) {/g,
          'if (!(err instanceof ValidationException)) {'
        )
        .replace(
          /\s*\/\/ Register API routes\s*await ClearRouter\.group\('\/api', async \(\) => \{\s*await importFile\(join\(process\.cwd\(\), 'src\/routes\/api\.ts'\)\)\s*\}\)\s*/g,
          '\n\n    ',
        )

      await writeFile(filePath, content, 'utf-8')
    }
  }

  /**
   * Stash `@arkstack/inertia`'s stubs out of the downloaded repo before the
   * template directory is mounted (which deletes everything but `templates/`).
   * They are reused later by {@link applyInertia} so the scaffold produces the
   * exact same artifacts as `ark publish --package @arkstack/inertia`.
   *
   * @param repoDir  The freshly downloaded repository directory.
   * @returns        `true` when the stubs were found and captured.
   */
  async captureInertiaStubs(repoDir: string) {
    const source = join(repoDir, 'packages', 'inertia', 'stubs')

    if (!existsSync(source)) {
      return false
    }

    const dest = join(tmpdir(), `create-arkstack-inertia-${process.pid}`)

    await rm(dest, { force: true, recursive: true })
    await cp(source, dest, { recursive: true })

    this.inertiaStubsDir = dest

    return true
  }

  /**
   * Layer Inertia onto the chosen runtime: copy the adapter config, root
   * template and framework client files, add the required dependencies, and
   * wire up the middleware, the root route and the TypeScript config — i.e.
   * everything `ark publish --package @arkstack/inertia` does, plus the bits the
   * publish step leaves to the developer, with no extra prompts.
   *
   * @param kit    The selected runtime (`express` | `h3`).
   * @param stack  The selected front-end stack (`react` | `vue` | `svelte`).
   */
  async applyInertia(kit: KitName, stack: string) {
    const spec = findInertiaStack(stack)

    if (!spec) {
      return
    }

    if (!this.inertiaStubsDir || !existsSync(this.inertiaStubsDir)) {
      Logger.parse(
        [
          [' WARN ', 'bgYellow'],
          ['Inertia stubs were not found; skipping Inertia setup.', 'white'],
        ],
        ' ',
      )

      return
    }

    if (!this.pkgPath) {
      await this.makeProfile()
    }

    await this.writeInertiaFiles(spec)
    await this.patchInertiaView(spec)
    this.addInertiaDependencies(spec)
    await this.patchInertiaMiddleware(kit)
    await this.patchInertiaWeb()
    await this.patchInertiaTsConfig(spec)

    await this.saveProfile()
  }

  /** 
   * Copy the shared + stack-specific stubs into the project, applying the 
   * same transforms publish does. 
   * 
   * @param spec 
   */
  private async writeInertiaFiles(spec: InertiaStackSpec) {
    for (const file of [...sharedInertiaFiles, ...spec.files]) {
      const from = join(this.inertiaStubsDir!, file.from)

      if (!existsSync(from)) {
        continue
      }

      const content = transformInertiaStub(await readFile(from, 'utf-8'), spec)
      const dest = join(this.location!, file.to)

      await mkdir(dirname(dest), { recursive: true })
      await writeFile(dest, content, 'utf-8')
    }
  }

  /**
   * Guarantee the root template is correct for the chosen stack, independent of
   * the downloaded stub's version. Older stubs (e.g. from a registry/repo that
   * predates the current contract) may ship without the `{{ext}}` /
   * `{{reactRefresh}}` placeholders and a hardcoded client entry, which would
   * leave React without its `@viteReactRefresh` preamble and pointing at the
   * wrong entry extension. This normalizes both.
   *
   * @param spec  The selected stack.
   */
  private async patchInertiaView(spec: InertiaStackSpec) {
    const file = join(this.location!, 'src/resources/views/app.edge')

    if (!existsSync(file)) {
      return
    }

    let content = await readFile(file, 'utf-8')

    // Resolve any placeholders the transform missed (stub predates the contract).
    content = content
      .replaceAll('{{ext}}', spec.ext)
      .replaceAll('{{reactRefresh}}', spec.reactRefresh ? '@viteReactRefresh\n    ' : '')

    // Normalize the client entry extension to the stack (old stubs may hardcode
    // `app.ts`/`app.js` even for React).
    content = content.replace(/resources\/js\/app\.[jt]sx?/g, `resources/js/app.${spec.ext}`)

    // React needs the Vite Refresh preamble before the entry tags.
    if (spec.reactRefresh && !content.includes('@viteReactRefresh')) {
      content = content.replace(/^([ \t]*)@vite\(/m, '$1@viteReactRefresh\n$1@vite(')
    }

    await writeFile(file, content, 'utf-8')
  }

  /** Merge the Inertia server + client dependencies into the project's package.json. */
  private addInertiaDependencies(spec: InertiaStackSpec) {
    this.packageJson.dependencies = {
      ...(this.packageJson.dependencies ?? {}),
      ...sharedInertiaDeps,
      ...spec.deps,
    }

    this.packageJson.devDependencies = {
      ...(this.packageJson.devDependencies ?? {}),
      ...spec.devDeps,
    }

    // Vite drives the client bundle; run it alongside `ark dev`.
    this.packageJson.scripts = {
      ...(this.packageJson.scripts ?? {}),
      'dev:client': 'vite',
      'build:client': 'vite build',
    }
  }

  /** 
   * Register the `inertia()` middleware (after `resora()`) in the 
   * runtime's middleware config. 
   * 
   * @param _kit 
   * @returns 
   */
  private async patchInertiaMiddleware(_kit: KitName) {
    const file = join(this.location!, 'src/config/middleware.ts')

    if (!existsSync(file)) {
      return
    }

    let content = await readFile(file, 'utf-8')

    // Add `inertia` to the driver middlewares import (express & h3 both list
    // `requestLogger, resora` there) and register it after `resora()`.
    if (!content.includes('inertia(')) {
      content = content
        .replace('requestLogger, resora }', 'inertia, requestLogger, resora }')
        .replace(/(\n(\s*)resora\(\),)/, '$1\n$2inertia(),')
    }

    await writeFile(file, content, 'utf-8')
  }

  /** 
   * Point the root route at an Inertia page instead of the welcome view. 
   * 
   * @returns 
   */
  private async patchInertiaWeb() {
    const file = join(this.location!, 'src/routes/web.ts')

    if (!existsSync(file)) {
      return
    }

    const content = (await readFile(file, 'utf-8'))
      .replace('import { view } from \'@arkstack/view\'', 'import { inertia } from \'@arkstack/inertia\'')
      .replace(/await view\(\s*'welcome'/, 'await inertia(\'Index\'')

    await writeFile(file, content, 'utf-8')
  }

  /** 
   * Enable JSX (React) and bring `resources/` into the TS program for the client code. 
    * 
    * @param spec 
    * @returns 
    */
  private async patchInertiaTsConfig(spec: InertiaStackSpec) {
    const file = join(this.location!, 'tsconfig.json')

    if (!existsSync(file)) {
      return
    }

    const json = JSON.parse(await readFile(file, 'utf-8'))

    json.compilerOptions = json.compilerOptions ?? {}

    if (spec.reactRefresh) {
      json.compilerOptions.jsx = 'react-jsx'
    }

    json.include = ['.arkstack/*.d.ts', 'src', 'tests', 'resources']

    await writeFile(file, JSON.stringify(json, null, 2) + '\n', 'utf-8')
  }

  async cleanup(kit: KitName) {
    const pkg = this.packageJson

    delete pkg.packageManager
    delete pkg.scripts.predev
    delete pkg.scripts.prebuild
    delete pkg.scripts.precmd
    delete pkg.scripts.cmd

    pkg.scripts.dev = 'ark dev'
    pkg.scripts.build = 'ark build'
    pkg.scripts.postinstall = 'prepare'

    pkg.name = Str.slugify(
      this.appName ?? basename(this.location!).replace('.', ''), '-'
    )

    if (this.description) {
      pkg.description = this.description
    }

    for (const name of Object.keys(pkg.dependencies)) {
      if (name.includes('@arkstack/driver') && name !== '@arkstack/driver-' + kit)
        delete pkg.dependencies[name]
    }

    this.packageJson = pkg

    await Promise.allSettled([
      this.saveProfile(),
      this.removeLockFile(),
      rm(join(this.location!, 'pnpm-workspace.yaml'), { force: true }),
      rm(join(this.location!, '.github'), { force: true, recursive: true }),
    ])
  }
}
