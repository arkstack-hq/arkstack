import type { ErrorBag } from '.'
import type { AuthSession } from '@arkstack/auth'

declare module 'clear-router' {
  interface ClearHttpContext {
    errors: ErrorBag
  }
}


declare module 'node:http' {
  interface IncomingMessage {
    rawBody?: Buffer
    session?: AuthSession | undefined;
  }
}

declare module 'clear-router/types/h3' {
  interface HttpRequest {
    rawBody?: Buffer
    session?: AuthSession | undefined;
  }
}

declare module 'clear-router' {
  interface HttpRequests {
    rawBody?: Buffer
    session?: AuthSession | undefined;
  }
}

declare module 'h3' {
  interface H3EventContext {
    rawBody?: Buffer
    session?: AuthSession | undefined;
  }
}

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer
      session?: AuthSession | undefined;
    }
  }
}