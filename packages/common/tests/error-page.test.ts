import { afterEach, describe, expect, test } from 'vitest'

import { renderError } from '../src/network'

describe('renderError', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).view
  })

  test('renders a built-in page when @arkstack/view is not installed', () => {
    const html = renderError({ code: 404, message: '<missing>', stack: 'at <anonymous>' })

    expect(html).toContain('<title>404 | Not Found</title>')
    expect(html).toContain('&lt;missing&gt;')
    expect(html).toContain('<pre>at &lt;anonymous&gt;</pre>')
  })

  test('omits the stack block when no stack is given', () => {
    expect(renderError({ code: 500 })).not.toContain('<pre>')
  })

  test('renders through the view global when it is registered', () => {
    ;(globalThis as Record<string, unknown>).view = (name: string, data: Record<string, unknown>) => ({
      renderSync: () => `${name}:${data.code}:${data.title}`,
    })

    expect(renderError({ code: 403 })).toBe('~arkstack/common.error:403:Forbidden')
  })
})
