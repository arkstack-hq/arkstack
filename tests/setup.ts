import { DB, Model } from 'arkormx'

import { createAdapter } from '@arkstack/database'
import dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true })

const adapter = createAdapter({ url: process.env.DATABASE_URL })
Model.setAdapter(adapter)
DB.setAdapter(adapter)
