import { PromiseOrValue } from './Arkstack'

export interface ArkstackRouteListOptions {
    path?: string;
}

export interface ArkstackRouterContract<TApp, TRoutes = unknown> {
    bind (app: TApp): PromiseOrValue<unknown>;
    list (options?: ArkstackRouteListOptions, app?: TApp): PromiseOrValue<TRoutes>;
}
