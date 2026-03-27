export type PromiseOrValue<T> = T | Promise<T>;

export interface ArkstackMiddlewareConfig<TMiddleware> {
  global: TMiddleware[];
  before: TMiddleware[];
  after: TMiddleware[];
}

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

/**
 * The ArkstackKitDriver class defines the contract for a driver 
 * that can be used with the ArkstackKitContract. 
 */
export abstract class ArkstackKitDriver<TApp, TMiddleware> {
  abstract readonly name: string;
  abstract createApp (): TApp;
  abstract mountPublicAssets (app: TApp, publicPath: string): PromiseOrValue<void>;
  abstract bindRouter (app: TApp): PromiseOrValue<void>;
  abstract applyMiddleware (app: TApp, middleware: ArkstackMiddlewareConfig<TMiddleware>): PromiseOrValue<void>;
  abstract applyMiddleware (app: TApp, middleware: TMiddleware): PromiseOrValue<void>;
  registerErrorHandler (_app: TApp): PromiseOrValue<void> {
    return
  }
  abstract start (app: TApp, port: number): PromiseOrValue<void>;
}

/**
 * The ArkstackKitContract class defines the contract for an 
 * application that uses the ArkstackKitDriver.
 */
export abstract class ArkstackKitContract<TApp, TMiddleware> {
  abstract app: TApp;
  abstract driver: ArkstackKitDriver<TApp, TMiddleware>;
  abstract middleware: ArkstackMiddlewareConfig<TMiddleware>;
  abstract boot (port: number): Promise<void>;
  abstract shutdown (): Promise<void>;
}
