import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export type PackageViewReference = {
    source: string
    packageName: string
    nodePackageName: string
    diskName: string
    viewName: string
    edgeName: string
}

export const parsePackageViewName = (name: string): PackageViewReference | null => {
    if (!name.startsWith('~')) {
        return null
    }

    const source = name.slice(1)
    const slashIndex = source.indexOf('/')
    const dotIndex = slashIndex === -1
        ? source.indexOf('.')
        : source.indexOf('.', slashIndex)

    if (dotIndex <= 0) {
        throw new Error(`Invalid package view name: ${name}`)
    }

    const packageName = source.slice(0, dotIndex)
    const viewName = source.slice(dotIndex + 1)

    if (!viewName) {
        throw new Error(`Invalid package view name: ${name}`)
    }

    const nodePackageName = slashIndex === -1
        ? packageName
        : `@${packageName}`
    const diskName = `package_${packageName.replace(/[^a-zA-Z0-9_-]/g, '_')}`

    return {
        source: name,
        packageName,
        nodePackageName,
        diskName,
        viewName,
        edgeName: `${diskName}::${viewName}`,
    }
}

export const resolvePackageViewsPath = (
    nodePackageName: string,
    viewPath = 'resources/views',
) => {
    const packageRoot = resolve(process.cwd(), 'node_modules', nodePackageName)
    const viewsPath = resolve(packageRoot, viewPath)

    if (!existsSync(viewsPath)) {
        throw new Error(`Package views directory not found: ${viewsPath}`)
    }

    return viewsPath
}
