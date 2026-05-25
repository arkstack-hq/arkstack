export interface ArkstackMiddlewareConfig<TMiddleware> {
    global: TMiddleware[];
    before: TMiddleware[];
    after: TMiddleware[];
}