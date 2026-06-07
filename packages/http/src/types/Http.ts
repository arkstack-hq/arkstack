import type { Request } from '../Request'
import { Response } from '../Response'
import type { Session } from '../session'

export type HeaderValue = string | string[] | number | boolean | null | undefined
export type HeaderMap = Record<string, string>
export type HeaderSource = Headers | Record<string, HeaderValue>
export type FunctionMiddleware = (...args: any[]) => any;
export type ClassMiddleware = new (...args: any[]) => { handle: FunctionMiddleware };

export type RequestSource<TUser = unknown> = {
    headers?: HeaderSource;
    method?: string;
    url?: string;
    originalUrl?: string;
    path?: string;
    ip?: string;
    user?: TUser;
    authToken?: string;
    req?: RequestSource<TUser>;
    request?: RequestSource<TUser>;
}

export type ResponseSource = {
    statusCode?: number;
    status?: number | ((code: number) => unknown);
    headers?: HeaderSource;
    setHeader?: (name: string, value: string | string[]) => unknown;
    getHeader?: (name: string) => string | string[] | number | undefined;
    json?: (body: unknown) => unknown;
    send?: (body: unknown) => unknown;
    redirect?: (status: number, path: string) => unknown;
}

export type RequestOptions<TUser = unknown> = {
    headers?: HeaderSource;
    method?: string;
    url?: string;
    path?: string;
    ip?: string | null;
    user?: TUser;
    authToken?: string;
    source?: unknown;
}

export interface RequestHelper<TUser = unknown> {
    (): Request
    <X extends string> (key: X): Request<TUser>['body'][X]
}

export interface SessionHelper {
    (): Session
    <X extends string> (key: X): any
}

export interface RedirectHelper {
    (): Response
    (to?: string, status?: number): Response
}

export interface OldHelper {
    (): Record<string, any>
    <T = any> (key: string, defaultValue?: T): T
}