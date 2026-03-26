import { Logger, Resolver } from '@h3ravel/shared'
import { copyFile, readFile, readdir, rm, unlink, writeFile } from 'node:fs/promises'
import { depsToAdd, depsToRemove, filesToRemove } from './data'
import path, { basename, join, relative } from 'node:path'

import type { KitName } from './types'
import { Str } from '@h3ravel/support'
import { chdir } from 'node:process'
import { depsList } from './data'
import { detectPackageManager } from '@antfu/install-pkg'
import { downloadTemplate } from 'giget'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

export default class {
  skipInstallation?: boolean

  constructor(
    private location?: string,
    private appName?: string,
    private description?: string,
  ) {
    if (!this.location) {
      this.location = join(process.cwd(), '.temp')
    }
  }

  async pm () {
    return (await detectPackageManager()) ?? 'npm'
  }

  async runCmd (npx: boolean = false) {
    if (npx) return 'npx'

    const pm = await this.pm()

    return pm === 'npm' ? 'npm run' : pm
  }

  async download (template: string, install = false, auth?: string, overwrite = false) {
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
  async installPackage (name?: string, args: string[] = []) {
    const bcmd = await Resolver.getPakageInstallCommand() + (name ? ` ${name}` : '')
    const cmd = bcmd.split(' ')[0]
    if (bcmd.includes(' ')) {
      args.unshift(...bcmd.split(' ').slice(1))
    }

    const child = spawnSync(cmd, args, {
      cwd: process.cwd(),
      stdio: 'ignore',
    })

    if (child.error) {
      return child.status
    }

    return 0
  }

  async complete (install = false) {
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
    // Logger.parse([
    //   ["Join our Discord server -", "white"],
    //   ["https://discord.gg/hsG2A8PuGb", "yellow"],
    // ]);
    Logger.parse([
      ['Checkout our other projects -', 'white'],
      ['https://toneflix.net/open-source', 'yellow'],
    ])
  }

  async cleanup (kit: KitName) {
    const pkgPath = join(this.location!, 'package.json')
    const pkg = await readFile(pkgPath!, 'utf-8').then(JSON.parse)

    delete pkg.packageManager
    delete pkg.scripts.predev
    delete pkg.scripts.prebuild
    delete pkg.scripts.precmd
    delete pkg.scripts.build
    delete pkg.scripts.dev
    delete pkg.scripts.cmd

    pkg.scripts.postinstall = 'prepare'

    pkg.name = Str.slugify(
      this.appName ?? basename(this.location!).replace('.', ''), '-'
    )

    if (this.description) {
      pkg.description = this.description
    }

    for (const [name, version] of Object.entries(depsList)) {
      if (name.includes('@arkstack/driver')) continue
      pkg.dependencies[name] = version
    }

    pkg.dependencies['@arkstack/driver-' + kit] = depsList[('@arkstack/driver-' + kit)]

    await Promise.allSettled([
      writeFile(pkgPath, JSON.stringify(pkg, null, 2)),
      this.removeLockFile(),
      rm(join(this.location!, 'pnpm-workspace.yaml'), { force: true }),
      rm(join(this.location!, '.github'), { force: true, recursive: true }),
    ])
  }

  async removeLockFile () {
    if (!this.skipInstallation) {
      return
    }

    await Promise.allSettled([
      unlink(join(this.location!, 'package-lock.json')),
      unlink(join(this.location!, 'yarn.lock')),
      unlink(join(this.location!, 'pnpm-lock.yaml')),
    ])
  }

  async getBanner () {
    return await readFile(join(process.cwd(), './logo.txt'), 'utf-8')
  }

  async copyExampleEnv () {
    const envPath = join(this.location!, '.env')
    const exampleEnvPath = join(this.location!, '.env.example')

    if (existsSync(exampleEnvPath)) {
      await copyFile(exampleEnvPath, envPath)
    }
  }

  async makeLeanProfile (_kit: KitName) {
    await Promise.allSettled(
      filesToRemove.map((file) => rm(join(this.location!, file), { force: true, recursive: true })),
    )

    const pkgPath = join(this.location!, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg = await readFile(pkgPath, 'utf-8').then(JSON.parse)

      for (const dep of depsToRemove) {
        delete pkg.dependencies?.[dep]
        delete pkg.devDependencies?.[dep]
      }

      for (const [name, version] of Object.entries(depsToAdd)) {
        pkg.dependencies[name] = version
      }

      await writeFile(pkgPath, JSON.stringify(pkg, null, 2))
    }

    const filesToPatch = [
      'src/core/app.ts',
      'src/core/router.ts',
      'src/core/bootstrap.ts',
      'src/core/utils/request-handlers.ts',
    ]

    for (const file of filesToPatch) {
      const filePath = join(this.location!, file)

      if (!existsSync(filePath)) {
        continue
      }

      let content = await readFile(filePath, 'utf-8')

      content = content
        .replace('import { ValidatorDBDriver } from \'./utils/drivers/ValidatorDBDriver\'\n', '')
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
          /\s*\/\/ Register API routes\s*await ClearRouter\.group\('\/api', async \(\) => \{\s*await import\(pathToFileURL\(join\(process\.cwd\(\), 'src\/routes\/api\.ts'\)\)\.href\)\s*\}\)\s*/g,
          '\n',
        )

      await writeFile(filePath, content, 'utf-8')
    }

  }
}
