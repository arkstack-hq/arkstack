import type { Arkstack } from '@arkstack/contract'
import { ArkstackConsoleApp } from '../app'
import { Command } from '@h3ravel/musket'
import type { Route } from 'clear-router'
import chalk from 'chalk'

type App = ArkstackConsoleApp<Arkstack<unknown, Route[]>>;

export class RouteList extends Command<App> {
    protected signature = `route:list
        {--p|path? : Path to filter routes by}
    `

    protected description = 'List all registered routes'

    async handle () {
        const routes = await this.app.core.getRouter().list(this.options(), this.app.core.getAppInstance())

        console.log(this.formatRoutes(routes.reverse()))
        this.newLine()
        this.info(`Total routes: ${routes.length}`)
    }

    private formatRoutes (routes: Route[]) {
        if (routes.length === 0) {
            return 'No routes registered.'
        }

        const rows = routes.map((route) => ({
            method: route.methods.join('|').toUpperCase(),
            path: route.path,
            handler: route.controllerName ? `${route.controllerName} → ${route.actionName}` : route.actionName ?? 'N/A',
        }))

        const methodWidth = Math.max('METHOD'.length, ...rows.map((row) => row.method.length))
        const pathWidth = Math.max('PATH'.length, ...rows.map((row) => row.path.length))
        const handlerWidth = Math.max('HANDLER'.length, ...rows.map((row) => row.handler.length))

        const header = `${'METHOD'.padEnd(methodWidth)}  ${'PATH'.padEnd(pathWidth)}  ${'HANDLER'.padEnd(handlerWidth)}`
        const divider = `${'-'.repeat(methodWidth)}  ${'-'.repeat(pathWidth)}  ${'-'.repeat(handlerWidth)}`
        const body = rows.map(
            (row) => `${chalk.green(row.method.padEnd(methodWidth))}  ${chalk.blue(row.path.padEnd(pathWidth))}  ${chalk.yellow(row.handler.padEnd(handlerWidth))}`
        )

        return [header, divider, ...body].join('\n')
    }
}
