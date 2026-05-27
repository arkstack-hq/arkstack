import type { Arkstack } from '@arkstack/contract'
import { ArkstackConsoleApp } from '../app'
import { Command } from '@h3ravel/musket'
import type { Route } from 'clear-router'
import chalk from 'chalk'

type App = ArkstackConsoleApp<Arkstack<unknown, Route[]>>;

export class RouteList extends Command<App> {
    protected signature = `route:list
        {--p|path? : Path to filter routes by}
        {--m|method? : Method to filter routes by}
    `

    protected description = 'List all registered routes'

    async handle () {
        const routes = await this.app.core.getRouter().list(this.options(), this.app.core.getAppInstance())
        const filteredRoutes = this.filterRoutes(routes)

        console.log(this.formatRoutes(filteredRoutes.reverse()))
        this.newLine()
        this.info(`Total routes: ${filteredRoutes.length}`)
    }

    private filterRoutes (routes: Route[]) {
        const path = this.option('path')
        const method = this.option('method')

        if (!path && !method) {
            return routes
        }

        return routes.filter((route) => {
            const pathMatches = path ? route.path.includes(path) : true
            const methodMatches = method ? route.methods.includes(method.toLowerCase()) : true

            return pathMatches && methodMatches
        })
    }

    private formatRoutes (routes: Route[]) {
        if (routes.length === 0) {
            return 'No routes registered.'
        }

        const rows = routes.map((route) => ({
            method: route.methods.join(' | ').toUpperCase(),
            path: route.path,
            handler: route.controllerName ? `${route.controllerName} → ${route.actionName}` : route.actionName ?? 'N/A',
        }))

        const methodWidth = Math.max('METHOD'.length, ...rows.map((row) => row.method.length))
        const pathWidth = Math.max('PATH'.length, ...rows.map((row) => row.path.length))
        const handlerWidth = Math.max('HANDLER'.length, ...rows.map((row) => row.handler.length))

        const header = `${'METHOD'.padEnd(methodWidth)}  ${'PATH'.padEnd(pathWidth)}  ${'HANDLER'.padEnd(handlerWidth)}`
        const divider = `${'-'.repeat(methodWidth)}  ${'-'.repeat(pathWidth)}  ${'-'.repeat(handlerWidth)}`
        const body = rows.map(
            (row) => `${this.formatMethod(row.method.padEnd(methodWidth))}  ${chalk.blue(row.path.padEnd(pathWidth))}  ${chalk.yellow(row.handler.padEnd(handlerWidth))}`
        )

        return [header, divider, ...body].join('\n')
    }

    private methodColor (method: string) {
        switch (method) {
            case 'GET':
                return chalk.green(method)
            case 'POST':
                return chalk.blue(method)
            case 'PUT':
                return chalk.yellow(method)
            case 'DELETE':
                return chalk.red(method)
            case 'PATCH':
                return chalk.magenta(method)
            case 'OPTIONS':
                return chalk.cyan(method)
            default:
                return chalk.gray(method)
        }
    }

    private formatMethod (method: string) {
        const methods = method.split(' | ')
        if (methods.length > 1) {
            return methods.map((m) => this.methodColor(m)).join(chalk.gray(' | '))
        }

        return this.methodColor(method.toUpperCase())
    }
}
