import { ChalkInstance } from 'chalk'
import type { Logger } from './Logger'

export interface ConfigRegistry { }
export interface EnvRegistry { }
export type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never

export type MergedConfig<X> = UnionToIntersection<X>
export type Primitive = string | number | boolean | null | undefined | ((e: any) => any)
export type LoggerChalk = keyof ChalkInstance | ChalkInstance | (keyof ChalkInstance)[]
export type LoggerParseSignature = [string, LoggerChalk][]
export type DotPathValue<T, P extends string> =
    P extends `${infer Head}.${infer Tail}`
    ? Head extends keyof T
    ? DotPathValue<T[Head], Tail>
    : never
    : P extends keyof T
    ? T[P]
    : never

export type DotPath<T> = T extends Primitive
    ? never
    : T extends any[]
    ? never
    : {
        [K in keyof T & string]: T[K] extends Primitive
        ? `${K}`
        : T[K] extends any[]
        ? `${K}`
        : `${K}` | `${K}.${DotPath<T[K]>}`
    }[keyof T & string]

/**
 * Ouput formater object or format the output
 * 
 * @param config 
 * @param joiner 
 * @param log If set to false, string output will be returned and not logged 
 * @param sc color to use ue on split text if : is found 
 * 
 * @returns 
 */
export interface LoggerLog {
    (): typeof Logger
    <L extends boolean> (
        config: string,
        joiner: LoggerChalk,
        log?: L,
        sc?: LoggerChalk
    ): L extends true ? void : string
    <L extends boolean> (
        config: LoggerParseSignature,
        joiner?: string,
        log?: L,
        sc?: LoggerChalk
    ): L extends true ? void : string
    <L extends boolean> (
        config?: LoggerParseSignature,
        joiner?: string,
        log?: L,
        sc?: LoggerChalk
    ): L extends true ? void : string | Logger
}


export interface GlobalEnv {
    <X = string, Y = undefined | X> (
        env: string,
        defaultValue?: Y,
    ): Y extends undefined ? X : Y
}

export type ConfigShape = keyof ConfigRegistry extends never
    ? Record<string, any>
    : ConfigRegistry

export interface GlobalConfig {
    <X extends ConfigShape> (): X
    <X extends ConfigShape, P extends DotPath<X>> (
        key: P,
    ): DotPathValue<X, P>
    <X extends ConfigShape, P extends DotPath<X>, D> (
        key: P,
        defaultValue: D,
    ): DotPathValue<X, P> | D
}

export type ArkstackErrorShape = Error & {
    cause?: unknown;
    code?: number | string;
    errors?: unknown;
    getModelName?: () => string;
    status?: number;
    statusCode?: number;
}

export interface ArkstackErrorPayload {
    status: 'error';
    code: number;
    message: string;
    errors?: unknown;
    stack?: string;
}

// Augmentable Hooks Registry 
export interface HookRegistry { }

type Position = 'before' | 'after' | (string & {})

export type IHook = {
    [P in Position]?: (...args: any[]) => void
}

// Derive available hook names
export type HookName = keyof HookRegistry extends never ? string : keyof HookRegistry | (string & {})

// Derive the IHook type for a given name
export type HookFor<N extends string> = N extends keyof HookRegistry
    ? HookRegistry[N]
    : IHook

export type HookPos<N extends string, P extends string> = N extends keyof HookRegistry
    ? P extends keyof HookRegistry[N]
    ? HookRegistry[N][P]
    : (...args: any[]) => void
    : (...args: any[]) => void

export type HookPositions<N extends string> = N extends keyof HookRegistry
    ? keyof HookRegistry[N]
    : Position

export type HookArgs<N extends string, P extends string> = N extends keyof HookRegistry
    ? P extends keyof HookRegistry[N]
    ? HookRegistry[N][P] extends (...args: infer A) => any
    ? A
    : any[]
    : any[]
    : any[]