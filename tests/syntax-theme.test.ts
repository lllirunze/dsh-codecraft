import { describe, expect, it } from 'vitest'

import { CODECRAFT_CSS } from '../src/client/theme.js'

describe('shared syntax theme', () => {
  it('defines the unified light and dark semantic palette inside CodeCraft', () => {
    expect(CODECRAFT_CSS).toContain('--cc-syn-foreground: #30343b')
    expect(CODECRAFT_CSS).toContain('--cc-syn-keyword: #74549c')
    expect(CODECRAFT_CSS).toContain('--cc-syn-property: #536a88')
    expect(CODECRAFT_CSS).toContain('body[data-ds-dark-theme] .dsh-codecraft')
    expect(CODECRAFT_CSS).toContain('--cc-syn-foreground: #d7dce3')
    expect(CODECRAFT_CSS).toContain('--cc-syn-keyword: #b8a3d5')
    expect(CODECRAFT_CSS).toContain('--cc-syn-property: #a5b5c8')
    expect(CODECRAFT_CSS).not.toMatch(/(^|\n)body\s*\{/)
  })

  it('leaves typography owned by the existing DSH font variables', () => {
    expect(CODECRAFT_CSS).toContain('font-family: var(--ds-font-family-code')
    expect(CODECRAFT_CSS).toContain('font-size: var(--dsh-code-font-size, 12.5px)')
    expect(CODECRAFT_CSS).not.toContain('dsh-codecraft-font-trigger')
  })
})
