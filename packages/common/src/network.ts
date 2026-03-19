import { config, env } from './system'

import { detect } from 'detect-port'

export const bootWithDetectedPort = async (
  boot: (port: number) => Promise<void>,
  preferredPort: number = 3000,
  app?: any
) => {
  if (app && !globalThis.app)
    globalThis.app = () => app
  globalThis.env = env
  globalThis.config = config
  globalThis.arkctx = {
    runtime: 'HTTP',
  }
  const port = await detect(preferredPort)
  await boot(port)
}


export const buildHtmlErrorResponse = ({
  message = 'An unexpected error occurred.',
  stack,
  title,
  code = 500,
}: {
  message?: string;
  stack?: string;
  code?: number;
  title?: string;
}) => {
  const titleMap: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  }

  title = titleMap[code] || title || 'Error'

  return `
    <html>
      <head>
        <title>${code} | ${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f8f8f8;
            color: #333;
            padding: 20px;
          }
          h1 {
            color: #e74c3c;
          }
          h3 {
            color: #3498db;
          }
          p {
            color: #555;
          }
          pre {
            background-color: #eee;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <h1>${code}</h1>
        <h3>${title}</h3>
        <p>${message}</p>
        ${stack ? `<h2>Stack Trace:</h2><pre>${stack}</pre>` : ''}
      </body>
    </html>
  `
}