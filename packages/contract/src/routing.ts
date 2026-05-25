import { PromiseOrValue } from './core'

export interface ArkstackRouteListOptions {
    path?: string;
}

export interface ArkstackRouterContract<TApp, TRoutes = unknown> {
    bind (app: TApp): PromiseOrValue<unknown>;
    list (options?: ArkstackRouteListOptions, app?: TApp): PromiseOrValue<TRoutes>;
}

export interface ArkstackRouterAwareCore<TApp, TRoutes = unknown> {
    getAppInstance (): TApp;
    getRouter (): ArkstackRouterContract<TApp, TRoutes>;
}
