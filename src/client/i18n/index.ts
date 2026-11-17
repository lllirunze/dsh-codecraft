import type { LocaleService } from '../dsh.js'
import type { Translate } from './contract.js'

export { en } from './messages/en/index.js'
export { zh } from './messages/zh/index.js'
export type { MessageKey, Translate, TranslationParams } from './contract.js'

/** Stable DSH namespace used by every CodeCraft Client contribution. */
export const CODECRAFT_LOCALE_NAMESPACE = 'sidebarCodeCraft'

/** Bind DSH's broad locale service to CodeCraft's catalog key contract. */
export function bindCodeCraftTranslator(locale: LocaleService): Translate {
  return locale.bind(CODECRAFT_LOCALE_NAMESPACE)
}

