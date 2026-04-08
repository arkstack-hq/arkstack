import { existsSync, readFileSync } from 'node:fs'

import { cwd } from 'node:process'
import { join } from 'node:path'

const filesToPatch = [
    'src/core/app.ts',
]

for (const file of filesToPatch) {
    const filePath = join(cwd(), '../express', file)
    if (!existsSync(filePath)) {
        continue
    }

    let content = readFileSync(filePath, 'utf-8')

    content = content
        .replace('import { ModelNotFoundException } from \'arkormx\'\n', '')
        .replace('import { prisma } from \'src/core/database\'\n', '')
        .replace('import { Prisma } from \'@prisma/client\'\n', '')
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

    console.log(content)
}