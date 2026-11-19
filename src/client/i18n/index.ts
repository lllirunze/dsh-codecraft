import type { LocaleService } from '../dsh.js'
import type { Translate } from './contract.js'
import { en } from './messages/en/index.js'

export { en } from './messages/en/index.js'
export { zh } from './messages/zh/index.js'
export { ja } from './messages/ja/index.js'
export { es } from './messages/es/index.js'
export { fr } from './messages/fr/index.js'
export { de } from './messages/de/index.js'
export { ru } from './messages/ru/index.js'
export { pt } from './messages/pt/index.js'
export type { MessageKey, Translate, TranslationParams } from './contract.js'

/** Stable DSH namespace used by every CodeCraft Client contribution. */
export const CODECRAFT_LOCALE_NAMESPACE = 'sidebarCodeCraft'

/** Bind DSH's broad locale service to CodeCraft's catalog key contract. */
export function bindCodeCraftTranslator(locale: LocaleService): Translate {
  let translate: ReturnType<LocaleService['bind']> | undefined
  const reported = new Set<string>()
  try {
    translate = locale.bind(CODECRAFT_LOCALE_NAMESPACE)
  } catch (error) {
    console.warn('CodeCraft locale binding failed; using English', error)
  }
  return (key, params) => {
    let result: string | undefined
    try {
      result = translate?.(key, params)
    } catch (error) {
      console.warn(`CodeCraft translation failed for ${key}`, error)
    }
    if (result !== undefined && result !== key && result.trim() !== '') return result
    if (!reported.has(key)) {
      reported.add(key)
      console.warn(`CodeCraft translation missing for ${key}; using English`)
    }
    return (en[key] ?? 'CodeCraft text unavailable').replace(
      /\{([^{}]+)\}/g,
      (_match, name: string) => String(params?.[name] ?? ''),
    )
  }
}

