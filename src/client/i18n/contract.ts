import type { en } from './messages/en/index.js'

/** Every translation key owned by CodeCraft. */
export type MessageKey = keyof typeof en

/** Values supported by DSH's locale interpolation contract. */
export type TranslationParams = Record<string, string | number>

/** Narrow translation boundary shared by all CodeCraft Client surfaces. */
export type Translate = (key: MessageKey, params?: TranslationParams) => string

