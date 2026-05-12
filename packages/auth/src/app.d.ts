import type { User } from '@arkstack/auth'
import type { Auth } from '@arkstack/auth'

declare module 'node:http' {
  interface IncomingMessage {
    user?: User | undefined;
    auth?: Auth | undefined;
    authUser?: User | undefined;
    authToken?: string | undefined;
  }
}

declare module 'clear-router/types/h3' {
  interface HttpRequest {
    user?: User | undefined;
    auth?: CurrentSession | undefined;
    authUser?: User | undefined;
    authToken?: string | undefined;
  }
}

declare module 'clear-router' {
  interface HttpRequests {
    user?: User | undefined;
    auth?: Auth | undefined;
    authUser?: User | undefined;
    authToken?: string | undefined;
  }
}

declare module 'h3' {
  interface H3EventContext {
    user?: User | undefined;
    auth?: Auth | undefined;
    authUser?: User | undefined;
    authToken?: string | undefined;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User | undefined;
      auth?: Auth | undefined;
      authUser?: User | undefined;
      authToken?: string | undefined;
    }
  }
}