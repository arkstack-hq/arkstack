import { IDatabaseDriver, ValidationDatabaseExistsInput } from 'kanun'

import { DB } from 'arkormx'

export class ValidatorDBDriver extends IDatabaseDriver {
    async exists ({ table, column, value, ignore }: ValidationDatabaseExistsInput) {
        try {
            const query = DB.table<{ id: string }>(table).where({ [column]: value })

            if (ignore) {
                query.whereNot({ [column]: ignore })
            }

            return await query.exists()
        } catch {
            return false
        }
    }
}