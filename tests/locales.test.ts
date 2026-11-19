import { describe, expect, expectTypeOf, it } from 'vitest'
import { ApiCallError, localizedErrorMessage } from '../src/client/api.js'
import type { CompletionContext } from '@codemirror/autocomplete'
import { localizeCompletionSource } from '../src/client/i18n/completion-details.js'
import {
  bindCodeCraftTranslator,
  CODECRAFT_LOCALE_NAMESPACE,
  en,
  zh,
  ja,
  es,
  fr,
  de,
  ru,
  pt,
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

  it('keeps exact key and placeholder parity across all eight locales', () => {
    for (const catalog of [zh, ja, es, fr, de, ru, pt]) {
      expect(Object.keys(catalog).sort()).toEqual(Object.keys(en).sort())
      for (const key of Object.keys(en) as MessageKey[]) {
        expect(placeholders(catalog[key]), key).toEqual(placeholders(en[key]))
      }
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

  it('uses readable English when DSH has no translated key or binding fails', () => {
    const missing = bindCodeCraftTranslator({
      bind: () => key => key,
      register: () => () => {},
    })
    expect(missing('status.saved')).toBe('Saved')
    expect(missing('status.cursor', { line: 2, column: 4 })).toBe('Ln 2, Col 4')

    const failed = bindCodeCraftTranslator({
      bind: () => { throw new Error('unavailable') },
      register: () => () => {},
    })
    expect(failed('action.save')).toBe('Save')
  })

  it('translates only CodeCraft-owned completion descriptions', () => {
    const source = localizeCompletionSource(
      () => ({ from: 0, options: [
        { label: 'psvm', detail: 'main method' },
        { label: 'external', detail: 'Provided by a language server' },
      ] }),
      () => translator(zh),
    )
    const result = source({} as CompletionContext)
    expect(result).not.toBeInstanceOf(Promise)
    if (result === null || result instanceof Promise) throw new Error('Expected a synchronous completion result')
    expect(result.options[0]?.detail).toBe('主方法')
    expect(result.options[1]?.detail).toBe('Provided by a language server')
  })
})

