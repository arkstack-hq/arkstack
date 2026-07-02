import { BaseTCConfig, TSConfig } from './TSConfig'
import { Node, Project, Type } from 'ts-morph'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'

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
    static configs(configDir?: string) {
        configDir ??= path.join(Arkstack.rootDir(), 'src/config')

        const declaration = this.generateConfig(configDir)

        writeFileSync(path.join(Arkstack.rootDir(), '.arkstack/ark.d.ts'), declaration, 'utf8')
    }

    static tsconfig() {
        const configs = {
            '.arkstack/tsconfig.json': JSON.stringify(TSConfig, undefined, 2),
            'tsconfig.json': JSON.stringify(BaseTCConfig, undefined, 2),
        }

        for (const [file, config] of Object.entries(configs))
            writeFileSync(path.join(Arkstack.rootDir(), file), config, 'utf8')
    }

    /**
     * Generate an `EnvRegistry` augmentation from the application's `.env`
     * schema, giving `env()` precise return types for app-specific variables.
     *
     * Mirrors {@link configs}: the declaration is appended to
     * `.arkstack/ark.d.ts`. Keys already typed by the framework's own
     * `EnvRegistry` are skipped so declaration merging never conflicts.
     *
     * @param envFile  Explicit `.env` path; defaults to `.env.example` then `.env`.
     */
    static env(envFile?: string) {
        const root = Arkstack.rootDir()
        const file = envFile ?? BuildInterfaces.resolveEnvFile(root)

        if (!file) return

        const declaration = BuildInterfaces.envRegistryFromEnv(
            readFileSync(file, 'utf8'),
            [...BuildInterfaces.frameworkEnvKeys()],
        )

        if (!declaration) return

        const target = path.join(root, '.arkstack/ark.d.ts')
        const existing = existsSync(target) ? readFileSync(target, 'utf8') : ''

        let content = `${existing}\n${declaration}\n`

        // `declare module` augmentation only works in a module; ensure exactly
        // one `export {}` (configs() already emits one when it runs first).
        if (!/^\s*export\s|\bimport\s/m.test(content)) {
            content += '\nexport {}\n'
        }

        writeFileSync(target, content, 'utf8')
    }

    /**
     * Render an `EnvRegistry` augmentation for the variables declared in the
     * given `.env` contents. Pure (no filesystem) for testability.
     *
     * @param contents  Raw `.env` file contents.
     * @param skip      Variable names to omit (e.g. framework-owned keys).
     * @returns         The `declare module` block, or `''` when nothing to emit.
     */
    static envRegistryFromEnv(contents: string, skip: string[] = []): string {
        const skipped = new Set(skip)

        const properties = Object.entries(BuildInterfaces.parseEnvFile(contents))
            .filter(([key]) => !skipped.has(key))
            .map(([key, value]) => `        ${key}: ${BuildInterfaces.inferEnvType(value)}`)

        if (!properties.length) return ''

        return [
            'declare module \'@arkstack/common\' {',
            '    interface EnvRegistry {',
            ...properties,
            '    }',
            '}',
        ].join('\n')
    }

    /** 
     * Prefer `.env.example` (the documented schema), then `.env`. 
     * 
     * @param root 
     * @returns 
     */
    private static resolveEnvFile(root: string): string | undefined {
        for (const name of ['.env.example', '.env']) {
            const file = path.join(root, name)

            if (existsSync(file)) return file
        }
    }

    /** 
     * Parse `KEY=VALUE` lines, skipping blanks, comments and invalid names. 
    * 
    * @param contents 
    * @returns 
    */
    private static parseEnvFile(contents: string): Record<string, string> {
        const entries: Record<string, string> = {}

        for (const raw of contents.split(/\r?\n/)) {
            const line = raw.trim()

            if (!line || line.startsWith('#')) continue

            const eq = line.indexOf('=')
            if (eq === -1) continue

            const key = line.slice(0, eq).trim()
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue

            let value = line.slice(eq + 1).trim()
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith('\'') && value.endsWith('\''))
            ) {
                value = value.slice(1, -1)
            }

            entries[key] = value
        }

        return entries
    }

    /** 
     * Infer a TS type from a value, mirroring env()'s runtime coercion.      
     *  
     * @param value 
     * @returns 
     */
    private static inferEnvType(value: string): 'string' | 'number' | 'boolean' {
        if (value === '') return 'string'
        if (['true', 'false', 'on', 'off'].includes(value)) return 'boolean'
        if (!Number.isNaN(Number(value))) return 'number'

        return 'string'
    }

    /** 
     * Resolve the framework's own `EnvRegistry` keys to skip during generation.  
     * 
     * @returns 
     */
    private static frameworkEnvKeys(): Set<string> {
        try {
            const project = new Project({
                tsConfigFilePath: path.join(Arkstack.rootDir(), 'tsconfig.json'),
                skipAddingFilesFromTsConfig: true,
            })

            const probe = project.createSourceFile(
                '__ark_env_probe__.ts',
                'import type { EnvRegistry } from \'@arkstack/common\'\ndeclare const value: EnvRegistry\n',
                { overwrite: true },
            )

            const keys = probe
                .getVariableDeclarationOrThrow('value')
                .getType()
                .getProperties()
                .map((prop) => prop.getName())

            return new Set(keys)
        } catch {
            // @arkstack/common types unavailable — emit all keys (identical
            // primitive types still merge cleanly).
            return new Set()
        }
    }

    /**
     * Render a config name as a valid interface property key. Config file names
     * become `ConfigRegistry` keys verbatim (they're the same key `config()`
     * resolves by at runtime, e.g. `config('rate-limit.max')`), so a hyphenated
     * or otherwise non-identifier name must be quoted — otherwise the generated
     * `.d.ts` is a syntax error and the whole registry augmentation is dropped.
     *
     * @param name  The config file base name (without `.ts`).
     */
    private static propertyKey(name: string): string {
        return /^[A-Za-z_$][\w$]*$/.test(name)
            ? name
            : `'${name.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`
    }

    private static generateConfig(
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
                properties.push(`        ${BuildInterfaces.propertyKey(configName)}: ${annotatedType}`)

                continue
            }

            const type = BuildInterfaces.checker.getTypeAtLocation(expr)

            // Unwrap the factory function to get the return type
            const callSignatures = type.getCallSignatures()
            const resolvedType = callSignatures.length
                ? callSignatures[0].getReturnType()
                : type

            const typeStr = BuildInterfaces.resolveType(resolvedType, 2)
            properties.push(`        ${BuildInterfaces.propertyKey(configName)}: ${typeStr}`)
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

    private static resolveReturnTypeAnnotation(
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

    private static findNamedTypeImport(
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

    private static renderImports(imports: Map<string, Set<string>>) {
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
    private static isDynamicMap(type: Type): boolean {
        return /^\{ \[x: (string|number)\]:/.test(type.getText())
    }

    private static resolveType(type: Type, indent: number): string {
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
