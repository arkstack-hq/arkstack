import { ArkstackMiddlewareConfig } from './http'
import { PromiseOrValue } from './Arkstack'

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