import { describe, expect, it } from 'vitest'
import {
  PROGRAMMING_LANGUAGE_DETAILS,
  PROGRAMMING_LANGUAGE_ORDER,
  SETTINGS_GROUP_ORDER,
  languageHasDetails,
  toggleExpandedLanguage,
} from '../src/client/settings/settings-layout.js'
import { en, zh } from '../src/client/i18n/index.js'

describe('CodeCraft settings layout', () => {
  it('keeps Programming Languages beside Indentation without a heading wrapper', () => {
    expect(SETTINGS_GROUP_ORDER).toEqual([
      'material-icons',
      'indentation',
      'programming-languages',
    ])
    expect(new Set(SETTINGS_GROUP_ORDER).size).toBe(SETTINGS_GROUP_ORDER.length)
    expect(SETTINGS_GROUP_ORDER).not.toContain('heading')
  })

  it('orders each existing language master switch exactly once', () => {
    expect(PROGRAMMING_LANGUAGE_ORDER).toEqual(['python', 'java', 'html'])
    expect(new Set(PROGRAMMING_LANGUAGE_ORDER).size).toBe(PROGRAMMING_LANGUAGE_ORDER.length)
  })

  it('offers disclosure only for languages with detail controls', () => {
    expect(PROGRAMMING_LANGUAGE_DETAILS).toEqual({
      python: ['semantic-completion', 'interpreter-path', 'server-path'],
      java: [],
      html: [],
    })
    expect(languageHasDetails('python')).toBe(true)
    expect(languageHasDetails('java')).toBe(false)
    expect(languageHasDetails('html')).toBe(false)
  })

  it('expands and collapses Python without expanding empty languages', () => {
    const collapsed = new Set<never>()
    const expanded = toggleExpandedLanguage(collapsed, 'python')
    expect([...expanded]).toEqual(['python'])
    expect(toggleExpandedLanguage(expanded, 'python').size).toBe(0)
    expect(toggleExpandedLanguage(expanded, 'java')).toBe(expanded)
    expect(toggleExpandedLanguage(expanded, 'html')).toBe(expanded)
  })

  it('provides the required localized section title', () => {
    expect(en['settings.group.programmingLanguages']).toBe('Programming Languages')
    expect(zh['settings.group.programmingLanguages']).toBe('编程语言')
    expect(en['settings.python.details.expand']).toBe('Expand Python settings')
    expect(en['settings.python.details.collapse']).toBe('Collapse Python settings')
    expect(zh['settings.python.details.expand']).toBe('展开 Python 详细设置')
    expect(zh['settings.python.details.collapse']).toBe('收起 Python 详细设置')
  })
})

