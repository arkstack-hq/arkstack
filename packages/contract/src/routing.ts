import { PromiseOrValue } from './core'

export interface ArkstackRouteListOptions {
    path?: string;
}

export interface ArkstackRouterContract<TApp, TRoutes = unknown> {
    bind (app: TApp): PromiseOrValue<unknown>;
    list (options?: ArkstackRouteListOptions, app?: TApp): PromiseOrValue<TRoutes>;
}

export abstract class ArkstackRouterAwareCore<TApp, TRoutes = unknown> {
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
}
