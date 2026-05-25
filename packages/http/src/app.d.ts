import { ErrorBag } from '.'

declare module 'clear-router' {
  interface HttpContext {
    errors: ErrorBag
  }
}

declare module 'clear-router/types/express' {
  interface HttpContext {
    errors: ErrorBag
  }
}

declare module 'clear-router/types/h3' {
  interface HttpContext {
    errors: ErrorBag
  }
}

declare module 'clear-router/types/fastify' {
  interface HttpContext {
    errors: ErrorBag
  }
}

declare module 'clear-router/types/koa' {
  interface HttpContext {
    errors: ErrorBag
  }
}

declare module 'hono' {
  interface HttpContext {
    errors: ErrorBag
  }
} 