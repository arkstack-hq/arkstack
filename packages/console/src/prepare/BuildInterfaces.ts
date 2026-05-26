import { BaseTCConfig, TSConfig } from './TSConfig'
import { ConfigRegistry, config } from '@arkstack/common'

import path from 'node:path'
import { writeFileSync } from 'node:fs'

export class BuildInterfaces {
    static configs () {
        const items = config()
        const output = this.buildInterface('ConfigRegistry', items)

        const declaration = [
            'export {}',
            '',
            'declare module \'@arkstack/common\' {',
            output,
            '}',
        ].join('\n')
        writeFileSync(path.join(process.cwd(), '.arkstack/ark.d.ts'), declaration, 'utf8')
    }

    static tsconfig () {
        const configs = {
            '.arkstack/tsconfig.json': JSON.stringify(TSConfig, undefined, 2),
            'tsconfig.json': JSON.stringify(BaseTCConfig, undefined, 2),
        }

        for (const [file, config] of Object.entries(configs))
            writeFileSync(path.join(process.cwd(), file), config, 'utf8')
    }

    private static isDynamicMap (obj: Record<string, unknown>): boolean {
        const keys = Object.keys(obj)
        if (keys.length === 0) return false

        return keys.every(key =>
            path.isAbsolute(key) ||
            /[^a-zA-Z0-9_$]/.test(key) ||
            /^\d/.test(key)
        )
    }

    private static inferType (value: unknown, indent: number): string {
        if (value === null) return 'null'
        if (typeof value === 'undefined') return 'any'
        if (typeof value === 'function') return 'Function'
        if (Array.isArray(value)) {
            if (value.length === 0) return 'unknown[]'
            const itemTypes = [...new Set(value.map(v => this.inferType(v, indent)))]

            return itemTypes.length === 1
                ? `${itemTypes[0]}[]`
                : `(${itemTypes.join(' | ')})[]`
        }
        if (typeof value === 'object') {
            const obj = value as Record<string, unknown>
            if (this.isDynamicMap(obj)) {
                const valueTypes = [...new Set(Object.values(obj).map(v => this.inferType(v, indent)))]
                const valueType = valueTypes.length === 1 ? valueTypes[0] : valueTypes.join(' | ')

                return `Record<string, ${valueType}>`
            }

            return this.buildInterface(undefined, obj, indent)
        }

        return typeof value
    }

    private static buildInterface (
        name: string | undefined,
        obj: Record<string, unknown> | ConfigRegistry,
        indent = 0
    ): string {
        const pad = '    '.repeat(indent)
        const innerPad = '    '.repeat(indent + 1)

        const lines = Object.entries(obj).map(([key, value]) => {
            const type = this.inferType(value, indent + 1)

            return `${innerPad}${key}: ${type}`
        })

        const body = lines.join('\n')

        return name
            ? `${pad}interface ${name} {\n${body}\n${pad}}`
            : `{\n${body}\n${pad}}`
    }
}