import { ErrorBag } from '.'

declare module 'clear-router' {
  interface ClearHttpContext {
    errors: ErrorBag
  }
} 