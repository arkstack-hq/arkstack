import { BaseTCConfig, TSConfig } from './TSConfig'
import { Node, Project, Type } from 'ts-morph'
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

        const imports = new Map<string, Set<string>>()
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
            const annotatedType = BuildInterfaces.resolveReturnTypeAnnotation(sourceFile, expr, imports)

            if (annotatedType) {
                properties.push(`        ${configName}: ${annotatedType}`)

                continue
            }

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
            ...BuildInterfaces.renderImports(imports),
            'declare module \'@arkstack/common\' {',
            '    interface ConfigRegistry {',
            ...properties,
            '    }',
            '}',
            '',
            'export {}',
        ].join('\n')
    }

    private static resolveReturnTypeAnnotation (
        sourceFile: ReturnType<Project['addSourceFileAtPath']>,
        expr: Node,
        imports: Map<string, Set<string>>,
    ) {
        if (!Node.isArrowFunction(expr) && !Node.isFunctionExpression(expr)) {
            return undefined
        }

        const returnType = expr.getReturnTypeNode()

        if (!returnType) {
            return undefined
        }

        const referencedNames = new Set<string>()

        if (Node.isTypeReference(returnType)) {
            referencedNames.add(returnType.getTypeName().getText())
        }

        returnType.forEachDescendant(node => {
            if (Node.isTypeReference(node)) {
                referencedNames.add(node.getTypeName().getText())
            }
        })

        for (const name of referencedNames) {
            const imported = BuildInterfaces.findNamedTypeImport(sourceFile, name)

            if (imported) {
                const specifiers = imports.get(imported.moduleSpecifier) ?? new Set<string>()
                specifiers.add(imported.specifier)
                imports.set(imported.moduleSpecifier, specifiers)
            }
        }

        return returnType.getText(!!sourceFile)
    }

    private static findNamedTypeImport (
        sourceFile: ReturnType<Project['addSourceFileAtPath']>,
        name: string,
    ) {
        for (const declaration of sourceFile.getImportDeclarations()) {
            for (const namedImport of declaration.getNamedImports()) {
                const alias = namedImport.getAliasNode()?.getText()
                const importedName = namedImport.getName()

                if ((alias ?? importedName) !== name) {
                    continue
                }

                return {
                    moduleSpecifier: declaration.getModuleSpecifierValue(),
                    specifier: alias ? `${importedName} as ${alias}` : importedName,
                }
            }
        }
    }

    private static renderImports (imports: Map<string, Set<string>>) {
        return [...imports.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([moduleSpecifier, specifiers]) => {
                const names = [...specifiers].sort().join(', ')

                return `import type { ${names} } from '${moduleSpecifier}'`
            })
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
