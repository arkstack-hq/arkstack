import { AbortPromptError, ExitPromptError } from '@inquirer/core'
import { basename, join } from 'node:path'
import { cleanDirectoryExcept, hoistDirectoryContents, mountTemplatesDir } from 'src/utils'
import { projectScopes, templates } from 'src/templates'

import Actions from 'src/actions'
import { Command } from '@h3ravel/musket'
import type { KitName } from 'src/types'
import { Logger } from '@h3ravel/shared'
import { Str } from '@h3ravel/support'
import { altLogo } from 'src/logo'
import inquirer from 'inquirer'

export class CreateArkstackCommand extends Command {
  protected signature = `create-arkstack
        {location?: The location where this project should be created relative to the current dir.}
        {--n|name?: The name of your project.}
        {--i|install: Install node_modules right away}
        {--t|token?: Kit repo authentication token.}
        {--d|desc?: Project Description.}
        {--k|kit?: Runtime template. [${templates.map(e => e.alias).join(',')}]}
        {--l|lean: Make a lean project.}
        {--p|pre: Download prerelease version if available.}
        {--o|overwrite: Overwrite the installation directory if it is not empty.}
    `
  protected description = 'Display a personalized greeting.'

  async handle () {
    const options = this.options()
    const pathName = this.argument('location')
    // const defaultName = pathName ? Str.of(pathName).afterLast("/") : undefined;

    console.log(altLogo, 'font-family: monospace')

    let { template } = await inquirer
      .prompt([
        {
          type: 'list',
          name: 'template',
          message: 'Choose Runtime:',
          choices: templates.map((e) => ({
            name: `${e.name} - ${e.hint}`,
            value: e.alias,
            disabled: !e.source ? '(Unavailable at this time)' : false,
          })),
          default: 'full',
          when: () => !options.kit,
        },
      ])
      .catch((err) => {
        if (err instanceof AbortPromptError || err instanceof ExitPromptError) {
          this.info('Thanks for trying out Arkstack.')
          process.exit(0)
        }

        return err
      })

    // eslint-disable-next-line prefer-const
    let { lean, appName, description } = await inquirer
      .prompt([
        {
          type: 'list',
          name: 'lean',
          message: 'Project Scope:',
          choices: projectScopes.map((e) => ({
            name: `${e.name} - ${e.hint.replace('{template}', Str.title(template))}`,
            value: e.lean,
          })),
          default: 'full',
          when: () => !options.lean,
        },
        {
          type: 'input',
          name: 'appName',
          message: 'What is the name of your project:',
          default: `arkstack-${template}`,
          // default: defaultName ?? `arkstack-${template}`,
          when: () => !options.name,
        },
        {
          type: 'input',
          name: 'description',
          message: 'Project Description:',
          default: `Simple ${Str.of(template).ucfirst()}.js project created with Arkstack.`,
          when: () => !options.desc,
        },
      ])
      .catch((err) => {
        if (err instanceof AbortPromptError || err instanceof ExitPromptError) {
          this.info('Thanks for trying out Arkstack.')
          process.exit(0)
        }

        return err
      })

    let { location } = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'location',
          message: 'Installation location relative to the current dir:',
          default: Str.slugify(options.name ?? appName ?? basename(process.cwd()), '-'),
          when: () => !pathName,
        },
      ])
      .catch((err) => {
        if (err instanceof AbortPromptError || err instanceof ExitPromptError) {
          this.info('Thanks for trying out Arkstack.')
          process.exit(0)
        }

        return err
      })

    /**
     * Find selected template kit
     */
    const kit = templates.find((e) => e.alias === (options.kit || template))!
    kit.lean = options.lean || lean || false

    let { install, token, pre } = await inquirer
      .prompt([
        {
          type: 'confirm',
          name: 'pre',
          message: `An alpha version of the ${kit.name.replace(/\s*template$/i, '').trim()} template is available. Would you like to use it instead?`,
          default: false,
          when: () => kit.prereleaseSource && !options.pre,
        } as never,
        {
          type: 'input',
          name: 'token',
          message: 'Authentication token:',
          when: () => options.kit && !options.token,
        },
        {
          type: 'confirm',
          name: 'install',
          message: 'Would you like to install node_modules right away?:',
          default: true,
          when: () => !options.install,
        },
      ])
      .catch((err) => {
        if (err instanceof AbortPromptError || err instanceof ExitPromptError) {
          this.info('Thanks for trying out Arkstack.')
          process.exit(0)
        }

        return err
      })

    pre = options.pre ?? pre
    token = options.token ?? token
    appName = options.name ?? appName
    install = options.install ?? install
    template = options.kit ?? template
    location = pathName ?? location
    description = options.description ?? description

    /**
     * Validate selected kit
     */
    if (kit && !kit.source) {
      this.error(`ERROR: The ${kit.name} kit is not currently available`)
      process.exit(1)
    }

    const kitName = (kit.baseAlias ?? kit.alias).replace(/-lean$/i, '') as KitName
    const source: string = pre && kit.prereleaseSource ? kit.prereleaseSource! : kit.source
    const actions = new Actions(join(process.cwd(), location), appName, description)
    const spinner = this.spinner('Loading Template...').start()

    const result = await actions.download(source, install, token, options.overwrite)

    if (result.dir && kitName) {
      await mountTemplatesDir(result.dir)
      await cleanDirectoryExcept(result.dir, kitName)
      await hoistDirectoryContents(result.dir, join(result.dir, kitName))
    }

    if (kit.lean) {
      spinner.info(Logger.parse([[
        'Applying lean profile...',
        'green',
      ]], '', false)).start()
      await actions.makeLeanProfile(kitName)
    } else {
      await actions.makeFullProfile(kitName)
    }

    spinner.info(Logger.parse([['Cleaning Up...', 'green']], '', false)).start()

    await actions.cleanup(kitName)

    spinner.info(Logger.parse([['Initializing Project...', 'green']], '', false)).start()

    await actions.createDotEnv(kit.lean ? 'min' : 'max')

    await actions.complete(install)

    spinner.succeed(Logger.parse([['Project initialization complete!', 'green']], '', false))
  }
}
