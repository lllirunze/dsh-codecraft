import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CodeCraftLogo, CODECRAFT_LOGO_URL } from '../src/client/branding.js'
import { CODECRAFT_CSS, CODECRAFT_LOGO_TOKEN, codecraftCss, cssImageUrl } from '../src/client/theme.js'

describe('CodeCraftLogo', () => {
  it('renders the shared package asset at its default size', () => {
    const markup = renderToStaticMarkup(createElement(CodeCraftLogo))
    expect(markup).toContain('class="dsh-codecraft-brand-logo"')
    expect(markup).toContain('width="20"')
    expect(markup).toContain('height="20"')
  })

  it('honors the size DSH guide capsules pass to registered icons', () => {
    const markup = renderToStaticMarkup(createElement(CodeCraftLogo, { size: 26 }))
    expect(markup).toContain('width="26"')
    expect(markup).toContain('height="26"')
    expect(markup).toContain('style="width:26px;height:26px"')
  })

  it('keeps an owner-supplied class beside the brand class', () => {
    const markup = renderToStaticMarkup(createElement(CodeCraftLogo, { className: 'guide-glyph' }))
    expect(markup).toContain('class="dsh-codecraft-brand-logo guide-glyph"')
  })
})

describe('cssImageUrl', () => {
  it('encodes characters that would end a CSS url() string or start a fragment', () => {
    expect(cssImageUrl('data:image/svg+xml,<svg width="8" fill="#fff">')).toBe(
      'url("data:image/svg+xml,<svg width=%228%22 fill=%22%23fff%22>")',
    )
  })

  it('keeps the bundled logo data URL valid inside url()', () => {
    const value = cssImageUrl(CODECRAFT_LOGO_URL)
    expect(value.startsWith('url("')).toBe(true)
    expect(value.slice(5, -2)).not.toMatch(/["#\\\n]/)
  })

  it('replaces the stylesheet token with the escaped bundled logo', () => {
    expect(CODECRAFT_CSS).toContain(CODECRAFT_LOGO_TOKEN)
    const css = codecraftCss(CODECRAFT_LOGO_URL)
    expect(css).not.toContain(CODECRAFT_LOGO_TOKEN)
    expect(css).toContain('background-image: url("data:image/svg+xml,')
  })
})
