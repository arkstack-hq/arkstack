import { ArkstackKitDriver } from './kits'
import { ArkstackRouterContract } from './routing'

export type PromiseOrValue<T> = T | Promise<T>;

export type ENV = 'development' | 'production' | 'stagging' | 'testing'

export abstract class Arkstack<TApp, TRoutes = unknown, THandler = unknown> {
    private static appRootDir: string = process.cwd()
    protected app!: TApp
    protected driver!: ArkstackKitDriver<TApp, THandler>

    abstract getAppInstance (): TApp;
    abstract getRouter (): ArkstackRouterContract<TApp, TRoutes>;
    /**
     * Boots the application by mounting public assets, binding the 
     * router, applying middleware, and starting the server.
     * 
     * @param port      The numeric port to run the server on
     * @param dontStart Set to true to skip server startup
     */
    abstract boot (port: number, dontStart?: boolean): Promise<void>

    /**
     * Gets the ArkstackKitDriver instance used by the application.
     * 
     * @returns 
     */
    abstract getDriver (): ArkstackKitDriver<TApp, TRoutes>

    /**
     * Boostrap the app and start up the server
     * 
     * @param defaultPort start the server with this port if none is APP_PORT env variable is not set
     * @param dontStart Set to true to skip server startup
     */
    async startup (defaultPort: number = 3000, dontStart?: boolean) {
        const { bootWithDetectedPort } = await import('@arkstack/common')
        await bootWithDetectedPort(async (port) => {
            await this.boot(port, dontStart)
        }, Number(process.env.APP_PORT ?? defaultPort), this)
    }

    /**
     * Get the current app root directory
     * 
     * @alias getRootDir()
     * @returns
     */
    static rootDir (): string {
        return this.appRootDir
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
        return this.appRootDir
    }

    /**
     * Set the current app root directory
     * 
     * @param dir   The prefered app root directory
     * @returns
     */
    setRootDir (dir: string): void {
        Arkstack.appRootDir = dir
    }

    /**
     * Set the current app root directory
     * 
     * @param dir   The prefered app root directory
     * @returns
     */
    static setRootDir (dir: string): void {
        this.appRootDir = dir
    }
}