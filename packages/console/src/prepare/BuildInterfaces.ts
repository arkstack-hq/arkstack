import { BaseTCConfig, TSConfig } from './TSConfig'
import { Project, Type } from 'ts-morph'
import { readdirSync, writeFileSync } from 'node:fs'

import { Arkstack } from '@arkstack/contract'
import path from 'node:path'

export class BuildInterfaces {
    private static project: Project
    private static checker: ReturnType<Project['getTypeChecker']>

    /**
     * Generate configuration interfaces
     * 
     * @param configDir 
     */
    static configs (configDir?: string) {
        configDir ??= path.join(Arkstack.rootDir(), 'src/config')

        const declaration = this.generateConfig(configDir)

        writeFileSync(path.join(Arkstack.rootDir(), '.arkstack/ark.d.ts'), declaration, 'utf8')
    }

    static tsconfig () {
        const configs = {
            '.arkstack/tsconfig.json': JSON.stringify(TSConfig, undefined, 2),
            'tsconfig.json': JSON.stringify(BaseTCConfig, undefined, 2),
        }

        for (const [file, config] of Object.entries(configs))
            writeFileSync(path.join(Arkstack.rootDir(), file), config, 'utf8')
    }

    private static generateConfig (
        configDir: string = path.join(process.cwd(), 'src/config'),
    ) {
        BuildInterfaces.project = new Project({
            tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
            skipAddingFilesFromTsConfig: true,
        })

        BuildInterfaces.checker = BuildInterfaces.project.getTypeChecker()

        const files = readdirSync(configDir).filter(f => f.endsWith('.ts'))

        const properties: string[] = []

        for (const file of files) {
            const configName = path.basename(file, '.ts')
            const sourceFile = BuildInterfaces.project.addSourceFileAtPath(
                path.join(configDir, file)
            )

            // Arkstack config files are `export default (app) => ({...})`
            // We need the expression, not the symbol, to get the correct type
            const exportAssignment = sourceFile.getExportAssignment(
                e => !e.isExportEquals()
            )

            if (!exportAssignment) continue

            const expr = exportAssignment.getExpression()
            const type = BuildInterfaces.checker.getTypeAtLocation(expr)

            // Unwrap the factory function to get the return type
            const callSignatures = type.getCallSignatures()
            const resolvedType = callSignatures.length
                ? callSignatures[0].getReturnType()
                : type

            const typeStr = BuildInterfaces.resolveType(resolvedType, 2)
            properties.push(`        ${configName}: ${typeStr}`)
        }

        return [
            'declare module \'@arkstack/common\' {',
            '    interface ConfigRegistry {',
            ...properties,
            '    }',
            '}',
            '',
            'export {}',
        ].join('\n')
    }

    /**
     * ts-morph resolves computed keys like path.join(...) as { [x: number]: any }
     * detect these by checking the type text for an index signature pattern
     * 
     * @param type 
     * @returns 
     */
    private static isDynamicMap (type: Type): boolean {
        return /^\{ \[x: (string|number)\]:/.test(type.getText())
    }

    private static resolveType (type: Type, indent: number): string {
        const pad = '    '.repeat(indent)
        const innerPad = '    '.repeat(indent + 1)

        // Primitives
        if (type.isString()) return 'string'
        if (type.isNumber()) return 'number'
        if (type.isBoolean()) return 'boolean'
        if (type.isNull()) return 'null'
        if (type.isUndefined()) return 'undefined'
        if (type.isAny() || type.isUnknown()) return 'any'

        // Literals
        if (type.isStringLiteral()) return `'${type.getLiteralValue()}'`
        if (type.isNumberLiteral()) return String(type.getLiteralValue())
        if (type.isBooleanLiteral()) return String(type.getLiteralValue())

        // Union
        if (type.isUnion()) {
            return type.getUnionTypes()
                .map(t => BuildInterfaces.resolveType(t, indent))
                .join(' | ')
        }

        // Array
        if (type.isArray()) {
            const elementType = type.getArrayElementTypeOrThrow()

            return `${BuildInterfaces.resolveType(elementType, indent)}[]`
        }
        // Function
        if (type.getCallSignatures().length) return 'Function'

        // Object
        if (type.isObject()) {
            // Dynamic computed keys (e.g. path.join(...) as key)
            if (BuildInterfaces.isDynamicMap(type)) {
                return 'Record<string, string>'
            }

            const props = type.getProperties()
            if (!props.length) return 'Record<string, any>'

            const lines = props.map(prop => {
                const decl = prop.getDeclarations()[0]
                if (!decl) return `${innerPad}${prop.getName()}: any`

                const propType = BuildInterfaces.checker.getTypeOfSymbolAtLocation(prop, decl)
                const optional = prop.isOptional() ? '?' : ''

                return `${innerPad}${prop.getName()}${optional}: ${BuildInterfaces.resolveType(propType, indent + 1)}`
            })

            return `{\n${lines.join('\n')}\n${pad}}`
        }

        // Fallback: use TypeScript's own text representation
        return type.getText()
    }
}
