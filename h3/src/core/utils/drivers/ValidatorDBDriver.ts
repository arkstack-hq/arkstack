import { IDatabaseDriver, ValidationDatabaseExistsInput } from 'kanun'

import { str } from '@h3ravel/support'

export class ValidatorDBDriver extends IDatabaseDriver {
    async exists ({ table, column, value, ignore }: ValidationDatabaseExistsInput) {
        try {
            const { prisma } = await import('src/database/prismaClient')
            const delegate = prisma[str(table).singular().toString() as keyof typeof prisma] as any
            const row = await delegate.findFirst({
                where: {
                    [column]: value,
                }
            })

            if (!row) return false
            if (ignore != null && String(row.id) === String(ignore)) return false

            return true
        } catch {
            return false
        }
    }
}