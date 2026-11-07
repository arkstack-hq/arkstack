export type ErrorPageOptions = {
  message?: string
  stack?: string
  code?: number
  title?: string
}

/** The `view()` global registered by `@arkstack/view`. */
type ViewGlobal = {
  view?: (name: string, data?: Record<string, unknown>) => { renderSync(): string }
}

/**
 * Renders the HTML error page, using the `~arkstack/common.error` view when
 * `@arkstack/view` is installed and a built-in document otherwise.
 */
export class ErrorPage {
  static readonly titles: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  }

  static render({ message = 'An unexpected error occurred.', stack, title, code = 500 }: ErrorPageOptions = {}) {
    const data = { code, title: this.titles[code] || title || 'Error', stack, message }
    const view = (globalThis as unknown as ViewGlobal).view

    if (typeof view === 'function') {
      return view('~arkstack/common.error', data).renderSync()
    }

    return this.document(data)
  }

  private static document({ code, title, stack, message }: Required<Omit<ErrorPageOptions, 'stack'>> & { stack?: string }) {
    return [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="UTF-8" />',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      `<title>${code} | ${this.escape(title)}</title>`,
      '<style>',
      ':root{color-scheme:light dark}',
      'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem 1rem;box-sizing:border-box;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#0b0c0e;color:#f5f0e8}',
      '@media (prefers-color-scheme: light){body{background:#f5f3ef;color:#1a1714}}',
      '.page{max-width:620px;width:100%}',
      '.code{font-size:3.5rem;font-weight:800;color:#e05252;margin:0 0 .5rem}',
      '.title{font-size:1.2rem;font-weight:700;margin:0 0 .6rem}',
      '.message{font-size:.8rem;opacity:.7;line-height:1.7;margin:0 0 2rem}',
      'pre{font-size:.72rem;line-height:1.85;overflow-x:auto;padding:1.1rem 1.25rem;border:1px solid rgba(220,60,60,.22);border-radius:10px}',
      '</style>',
      '</head>',
      '<body>',
      '<div class="page">',
      `<div class="code">${code}</div>`,
      `<div class="title">${this.escape(title)}</div>`,
      `<p class="message">${this.escape(message)}</p>`,
      ...(stack ? [`<pre>${this.escape(stack)}</pre>`] : []),
      '</div>',
      '</body>',
      '</html>',
    ].join('\n')
  }

  private static escape(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
}
