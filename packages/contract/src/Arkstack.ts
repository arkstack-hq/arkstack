import { ArkstackKitDriver } from './kits'
import { ArkstackRouterContract } from './routing'
import { Hook } from '@arkstack/foundry'

export type PromiseOrValue<T> = T | Promise<T>;

export type ENV = 'development' | 'production' | 'stagging' | 'testing'
export type RootDirChangeListener = (dir: string, previousDir: string) => void

export abstract class Arkstack<TApp, TRoutes = unknown, THandler = unknown> {
    static app: unknown
    private static appRootDir: string = process.cwd()
    protected app!: TApp
    protected driver!: ArkstackKitDriver<TApp, THandler>

    abstract getRouter (): ArkstackRouterContract<TApp, TRoutes>;
    /**
     * Boots the application by mounting public assets, binding the 
     * router, applying middleware, and starting the server.
     * 
     * @param port      The numeric port to run the server on
     * @param defer     Set to true to skip server startup
     */
    abstract boot (port: number, defer?: boolean): Promise<void>

    /**
     * Gets the driver application instance.
     * 
     * @returns 
     */
    getAppInstance () {
        return this.app
    }

    /**
     * Gets the static driver application instance.
     * 
     * @returns 
     */
    static getAppInstance<TApp = unknown> (): TApp {
        return Arkstack.app as TApp
    }

    /**
     * Gets the ArkstackKitDriver instance used by the application.
     * 
     * @returns 
     */
    getDriver () {
        return this.driver
    }

    /**
     * Boostrap the app and start up the server
     * 
     * @param defaultPort   start the server with this port if none is APP_PORT env variable is not set
     * @param defer         Set to true to skip server startup
     */
    async startup (defaultPort: number = 3000, defer?: boolean) {
        const { bootWithDetectedPort } = await import('@arkstack/common')
        await bootWithDetectedPort<TApp, TRoutes, THandler>(async (port) => {
            await this.boot(port, defer)
        }, Number(process.env.APP_PORT ?? defaultPort), this as never, defer)
    }

    /**
     * Shuts down the application by disconnecting from the database and exiting the process.
     */
    async shutdown () {
        process.exit(0)
    }

    /**
     * Get the current app root directory
     * 
     * @alias getRootDir()
     * @returns
     */
    static rootDir (): string {
        return Arkstack.appRootDir
    }

    /**
     * Get the current app root directory
     * 
     * @alias getRootDir()
     * @returns
     */
    rootDir (): string {
        return Arkstack.appRootDir
    }

    /**
     * Get the current app root directory
     * 
     * @returns
     */
    static getRootDir (): string {
        return Arkstack.appRootDir
    }

    /**
     * Set the current app root directory
     * 
     * @param dir   The prefered app root directory
     * @returns
     */
    setRootDir (dir: string): void {
        Arkstack.setRootDir(dir)
    }

    /**
     * Set the current app root directory
     * 
     * @param dir   The prefered app root directory
     * @returns
     */
    static setRootDir (dir: string): void {
        const previousDir = Arkstack.appRootDir
        Arkstack.appRootDir = dir

        if (previousDir === dir) {
            return
        }

        if (Hook.has('set:root-dir', 'after'))
            Hook.get('set:root-dir', 'after', dir)
    }
}
