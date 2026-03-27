import { ChalkInstance } from 'chalk'
import { DotPath } from '@h3ravel/support'
import type { Logger } from './Logger'

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


export interface GlobalConfig {
    <X extends Record<string, any>> (): X
    <X extends Record<string, any>, P extends DotPath<X>> (
        key: P,
    ): DotPathValue<X, P>
    <X extends Record<string, any>, P extends DotPath<X>, D> (
        key: P,
        defaultValue: D,
    ): DotPathValue<X, P> | D
}