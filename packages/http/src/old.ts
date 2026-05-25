import { Request } from './Request'
import { getPath } from './session/utils'
import { isRecord } from './helpers'

const requestInput = () => {
    const request = globalThis.request?.()

    if (request instanceof Request) {
        if (isRecord(request.body)) {
            return request.body
        }

        const source = isRecord(request.source) ? request.source : undefined

        if (source && typeof source.getBody === 'function') {
            return source.getBody() ?? {}
        }

        if (isRecord(source?.body)) {
            return source.body
        }
    }

    if (isRecord(request) && typeof request.getBody === 'function') {
        return request.getBody() ?? {}
    }

    return isRecord(request?.body) ? request.body : {}
}

export const old = <T = any> (key?: string, defaultValue?: T): T => {
    const input = requestInput()

    if (!key) {
        return input as T
    }

    return getPath(input, key, defaultValue) as T
}
