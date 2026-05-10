import { H3Event } from 'h3'
import { NextFunction } from 'clear-router/types/h3'
import { vary } from '../utils/vary'

const isString = (s: any) => {
  return typeof s === 'string' || s instanceof String
}

const isOriginAllowed = (origin: string, allowedOrigin: string | string[] | RegExp | boolean) => {
  if (Array.isArray(allowedOrigin)) {
    for (let i = 0; i < allowedOrigin.length; ++i) {
      if (isOriginAllowed(origin, allowedOrigin[i])) {
        return true
      }
    }

    return false
  } else if (isString(allowedOrigin)) {
    return origin === allowedOrigin
  } else if (allowedOrigin instanceof RegExp) {
    return allowedOrigin.test(origin)
  } else {
    return !!allowedOrigin
  }
}

const configureOrigin = (
  options: { origin?: string | string[] | RegExp | boolean },
  req: H3Event['req'],
) => {
  let isAllowed: boolean
  const requestOrigin = req.headers.get('origin') || '*',
    headers = []

  if (!options.origin || options.origin === '*') {
    // allow any origin
    headers.push([
      {
        key: 'Access-Control-Allow-Origin',
        value: '*',
      },
    ])
  } else if (isString(options.origin)) {
    // fixed origin
    headers.push([
      {
        key: 'Access-Control-Allow-Origin',
        value: options.origin,
      },
    ])
    headers.push([
      {
        key: 'Vary',
        value: 'Origin',
      },
    ])
  } else {
    isAllowed = isOriginAllowed(requestOrigin, options.origin)
    // reflect origin
    headers.push([
      {
        key: 'Access-Control-Allow-Origin',
        value: isAllowed ? requestOrigin : false,
      },
    ])
    headers.push([
      {
        key: 'Vary',
        value: 'Origin',
      },
    ])
  }

  return headers
}

const configureMethods = (options: { methods?: string[] | string }) => {
  let methods = options.methods
  if (Array.isArray(methods)) {
    methods = methods.join(',') // .methods is an array, so turn it into a string
  }

  return {
    key: 'Access-Control-Allow-Methods',
    value: methods,
  }
}

const configureCredentials = (options: { credentials?: boolean }) => {
  if (options.credentials === true) {
    return {
      key: 'Access-Control-Allow-Credentials',
      value: 'true',
    }
  }

  return null
}

const configureAllowedHeaders = (
  options: { allowedHeaders?: string[] | string | null; headers?: string[] | string | null },
  req: H3Event['req'],
) => {
  let allowedHeaders = options.allowedHeaders || options.headers
  const headers = []

  if (!allowedHeaders) {
    allowedHeaders = req.headers.get('access-control-request-headers') // .headers wasn't specified, so reflect the request headers
    headers.push([
      {
        key: 'Vary',
        value: 'Access-Control-Request-Headers',
      },
    ])
  } else if (Array.isArray(allowedHeaders)) {
    allowedHeaders = allowedHeaders.join(',') // .headers is an array, so turn it into a string
  }
  if (allowedHeaders && allowedHeaders.length) {
    headers.push([
      {
        key: 'Access-Control-Allow-Headers',
        value: allowedHeaders,
      },
    ])
  }

  return headers
}

function configureExposedHeaders (options: { exposedHeaders?: string[] | string }) {
  let headers = options.exposedHeaders
  if (!headers) {
    return null
  } else if (Array.isArray(headers)) {
    headers = headers.join(',') // .headers is an array, so turn it into a string
  }
  if (headers && headers.length) {
    return {
      key: 'Access-Control-Expose-Headers',
      value: headers,
    }
  }

  return null
}

function configureMaxAge (options: { maxAge?: number | string }) {
  const maxAge = (typeof options.maxAge === 'number' || options.maxAge) && options.maxAge.toString()
  if (maxAge && maxAge.length) {
    return {
      key: 'Access-Control-Max-Age',
      value: maxAge,
    }
  }

  return null
}

function applyHeaders (headers: any[], res: H3Event['res']) {
  for (let i = 0, n = headers.length; i < n; i++) {
    const header = headers[i]
    if (header) {
      if (Array.isArray(header)) {
        applyHeaders(header, res)
      } else if (header.key === 'Vary' && header.value) {
        vary(res, header.value)
      } else if (header.value) {
        res.headers.set(header.key, header.value)
      }
    }
  }
}

export const cors =
  (
    options: {
      origin?: string | string[] | RegExp | boolean;
      methods?: string[] | string;
      allowedHeaders?: string[] | string | null;
      exposedHeaders?: string[] | string;
      credentials?: boolean;
      maxAge?: number | string;
      optionsSuccessStatus?: number;
      preflightContinue?: boolean;
    } = {},
  ) =>
    async (event: H3Event, next: NextFunction) => {
      const headers = [],
        method = event.req.method && event.req.method.toUpperCase && event.req.method.toUpperCase()

      if (method === 'OPTIONS') {
        // preflight
        headers.push(configureOrigin(options, event.req))
        headers.push(configureCredentials(options))
        headers.push(configureMethods(options))
        headers.push(configureAllowedHeaders(options, event.req))
        headers.push(configureMaxAge(options))
        headers.push(configureExposedHeaders(options))
        applyHeaders(headers, event.res)

        if (options.preflightContinue) {
          next()
        } else {
          // Safari (and potentially other browsers) need content-length 0,
          //   for 204 or they just hang waiting for a body
          event.res.status = options.optionsSuccessStatus
          event.res.headers.set('Content-Length', '0')
        }
      } else {
        // actual response
        headers.push(configureOrigin(options, event.req))
        headers.push(configureCredentials(options))
        headers.push(configureExposedHeaders(options))
        applyHeaders(headers, event.res)
        next()
      }
    }
