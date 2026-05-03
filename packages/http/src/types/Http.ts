export type HeaderValue = string | string[] | number | boolean | null | undefined
export type HeaderMap = Record<string, string>
export type HeaderSource = Headers | Record<string, HeaderValue>

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
    setHeader?: (name: string, value: string) => unknown;
    json?: (body: unknown) => unknown;
    send?: (body: unknown) => unknown;
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