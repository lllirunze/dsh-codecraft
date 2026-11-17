import { describe, expect, expectTypeOf, it } from 'vitest'
import { ApiCallError, localizedErrorMessage } from '../src/client/api.js'
import {
  CODECRAFT_LOCALE_NAMESPACE,
  en,
  zh,
  type MessageKey,
  type Translate,
} from '../src/client/i18n/index.js'
import { enCore } from '../src/client/i18n/messages/en/core.js'
import { enHtml } from '../src/client/i18n/messages/en/html.js'
import { enSettings } from '../src/client/i18n/messages/en/settings.js'
import { enWorkspace } from '../src/client/i18n/messages/en/workspace.js'
import { zhCore } from '../src/client/i18n/messages/zh/core.js'
import { zhHtml } from '../src/client/i18n/messages/zh/html.js'
import { zhSettings } from '../src/client/i18n/messages/zh/settings.js'
import { zhWorkspace } from '../src/client/i18n/messages/zh/workspace.js'

const PLACEHOLDER = /\{([^{}]+)\}/g

function placeholders(message: string): string[] {
  return [...message.matchAll(PLACEHOLDER)]
    .map(match => match[1] ?? '')
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort()
}

function translator(messages: Record<string, string>): Translate {
  return (key, params) => messages[key]!.replace(PLACEHOLDER, (_, name: string) => String(params?.[name] ?? `{${name}}`))
}

describe('CodeCraft locale catalogs', () => {
  it('keeps one stable DSH namespace and a typed translation boundary', () => {
    expect(CODECRAFT_LOCALE_NAMESPACE).toBe('sidebarCodeCraft')
    expectTypeOf<Parameters<Translate>[0]>().toEqualTypeOf<MessageKey>()
    // @ts-expect-error CodeCraft translation keys must exist in the catalog.
    const invalidKey: MessageKey = 'not.a.codecraft.message'
    expect(invalidKey).toBe('not.a.codecraft.message')
  })

  it('composes each language from four non-overlapping domains', () => {
    for (const domains of [
      [enCore, enWorkspace, enSettings, enHtml],
      [zhCore, zhWorkspace, zhSettings, zhHtml],
    ]) {
      const keys = domains.flatMap(domain => Object.keys(domain))
      expect(new Set(keys).size).toBe(keys.length)
      expect(keys).toHaveLength(Object.keys(en).length)
    }
  })

  it('keeps exact key and placeholder parity between English and Chinese', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort())
    for (const key of Object.keys(en) as MessageKey[]) {
      expect(placeholders(zh[key]), key).toEqual(placeholders(en[key]))
    }
  })

  it('localizes Client-owned transport failures and preserves unknown Host details', () => {
    const enT = translator(en)
    const zhT = translator(zh)
    const network = new ApiCallError(
      'network',
      'legacy fallback',
      0,
      'error.api.network',
    )
    const malformed = new ApiCallError(
      'bad-response',
      'legacy fallback',
      502,
      'error.api.invalidResponse',
      { status: 502 },
    )

    expect(localizedErrorMessage(network, enT)).toBe('Unable to connect to the CodeCraft service.')
    expect(localizedErrorMessage(network, zhT)).toBe('无法连接 CodeCraft 服务。')
    expect(localizedErrorMessage(malformed, enT)).toContain('HTTP 502')
    expect(localizedErrorMessage(new ApiCallError('denied', 'Host detail'), enT)).toBe('Host detail')
    expect(localizedErrorMessage(new Error('technical detail'), enT, 'breadcrumb.readFailed'))
      .toBe('This folder could not be read.')
  })
})

