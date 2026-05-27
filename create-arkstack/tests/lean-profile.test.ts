import { afterEach, describe, expect, test } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'

import Actions from '../src/actions'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const tempDirs: string[] = []

afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })))
    tempDirs.length = 0
})

describe('makeLeanProfile', () => {
    test('removes controllers,resources dirs, api route, and prisma/database artifacts from lean kits', async () => {
        const location = await mkdtemp(join(tmpdir(), 'create-arkstack-lean-'))
        tempDirs.push(location)

        await mkdir(join(location, 'src/database/migrations'), { recursive: true })
        await mkdir(join(location, 'src/app/http/controllers'), { recursive: true })
        await mkdir(join(location, 'src/app/http/resources'), { recursive: true })
        await mkdir(join(location, 'src/app/models'), { recursive: true })
        await mkdir(join(location, 'src/core'), { recursive: true })
        await mkdir(join(location, 'src/routes'), { recursive: true })
        await mkdir(join(location, 'prisma/migrations'), { recursive: true })

        await writeFile(join(location, 'src/app/http/controllers/UserController.ts'), 'export default class UserController {}\n')
        await writeFile(join(location, 'src/app/http/resources/UserCollection.ts'), 'export default class UserCollection {}\n')
        await writeFile(join(location, 'src/app/http/resources/UserResource.ts'), 'export default class UserResource {}\n')
        await writeFile(join(location, 'src/app/models/UserModel.ts'), 'export default class UserModel {}\n')
        await writeFile(join(location, 'src/database/migrations/0000_initial.ts'), 'export default class InitialMigration {}\n')
        await writeFile(join(location, 'src/core/database.ts'), 'export const prisma = {} as any;\n')
        await writeFile(join(location, 'src/core/bootstrap.ts'), 'import \'@arkstack/database/setup\'')
        await writeFile(join(location, 'prisma.config.ts'), 'export default {};\n')
        await writeFile(join(location, 'arkormx.config.ts'), 'export default {};\n')
        await writeFile(join(location, 'prisma/migrations/migration_lock.toml'), '# lock\n')

        await writeFile(
            join(location, 'src/core/app.ts'),
            [
                'export default class Application {',
                '  /**',
                '   * Shuts down the application by disconnecting from the database and exiting the process.',
                '   */',
                '  async shutdown () {',
                '    process.exit(0)',
                '  }',
                '}',
                '',
            ].join('\n'),
        )

        await writeFile(
            join(location, 'src/routes/api.ts'),
            'Router.get(\'/stale\', () => [])\n',
        )

        await writeFile(
            join(location, 'package.json'),
            JSON.stringify(
                {
                    dependencies: {
                        pg: '^8.18.0',
                        keep: '^1.0.0',
                        kysely: '^0.28.15',
                        arkormx: '^0.2.0',
                    },
                    devDependencies: {
                        prisma: '^7.4.0',
                        '@types/pg': '^8.16.0',
                        keepDev: '^1.0.0',
                    },
                },
                null,
                2,
            ),
        )

        const actions = new Actions(location)
        await actions.makeLeanProfile('express')
        await actions.saveProfile()

        expect(existsSync(join(location, 'src/app/http/controllers'))).toBe(false)
        expect(existsSync(join(location, 'src/app/http/resources'))).toBe(false)
        expect(existsSync(join(location, 'src/app/models'))).toBe(false)
        expect(existsSync(join(location, 'src/routes/api.ts'))).toBe(false)
        expect(existsSync(join(location, 'src/database'))).toBe(false)
        expect(existsSync(join(location, 'src/core/database.ts'))).toBe(false)
        expect(existsSync(join(location, 'prisma.config.ts'))).toBe(false)
        expect(existsSync(join(location, 'arkormx.config.ts'))).toBe(false)
        expect(existsSync(join(location, 'prisma'))).toBe(false)

        const pkg = JSON.parse(await readFile(join(location, 'package.json'), 'utf-8'))
        expect(pkg.dependencies.kysely).toBeUndefined()
        expect(pkg.dependencies.arkormx).toBeUndefined()
        expect(pkg.dependencies.pg).toBeUndefined()
        expect(pkg.devDependencies.prisma).toBeUndefined()
        expect(pkg.dependencies.keep).toBe('^1.0.0')
        expect(pkg.devDependencies.keepDev).toBe('^1.0.0')

        const appContent = await readFile(join(location, 'src/core/app.ts'), 'utf-8')
        expect(appContent).not.toContain('import { ModelNotFoundException } from \'arkormx\'')

        const bootContent = await readFile(join(location, 'src/core/bootstrap.ts'), 'utf-8')
        expect(bootContent).not.toContain('import \'@arkstack/database/setup\'')
    })
})
