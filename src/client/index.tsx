/**
 * DSH CodeCraft — browser half.
 *
 * Registers one document-preview implementation for source and text files.
 * DSH's native file tree and file tab stay in charge of opening, switching,
 * closing, and the viewer menu; CodeCraft only supplies the tab body.
 *
 * @module dsh-codecraft/client
 */

import type { ClientContext } from './dsh.js'
import { CodeCraftBody } from './CodeCraftBody.js'
import { EDITOR_EXTENSIONS } from './languages.js'
import { drafts } from './drafts.js'
import { en, zh } from './locales.js'
import { CODECRAFT_CSS } from './theme.js'

/** Browser services required before mounting. */
export const inject = ['documentPreviews', 'slots', 'locale']

/** Locale namespace bound to both the viewer label and the body copy. */
const LOCALE_NAMESPACE = 'sidebarCodeCraft'

/** Unique identity in DSH's preview registry and the keyed body slot. */
const PREVIEW_ID = 'dsh-codecraft'

/**
 * Register the editor for this plugin's lifetime.
 * @param ctx - browser context carrying the preview registry, slots, and copy.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.dshCodecraft = '0.1.0'
    style.textContent = CODECRAFT_CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, 'dsh-codecraft: editor theme')

  ctx.effect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (drafts.addresses().length === 0) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, 'dsh-codecraft: durable-draft unload guard')

  ctx.effect(
    () => ctx.locale.register(LOCALE_NAMESPACE, { zh, en }),
    'dsh-codecraft: dictionaries',
  )
  const t = ctx.locale.bind(LOCALE_NAMESPACE)

  ctx.effect(() => ctx.documentPreviews.register({
    id: PREVIEW_ID,
    extensions: EDITOR_EXTENSIONS,
    // The external band wins over DSH's builtin Code/Plain-text previewers for
    // the claimed suffixes; those previewers remain selectable in the menu.
    priority: 'extension',
    title: () => t('title'),
    loading: 'renderer',
    wrap: false,
  }), 'dsh-codecraft: renderer metadata')

  ctx.effect(() => ctx.slots.inject('sidebar.right.tab.document', () => ctx.slots.register({
    name: 'sidebar.right.tab.document',
    key: PREVIEW_ID,
    locale: LOCALE_NAMESPACE,
  }, CodeCraftBody)), 'dsh-codecraft: renderer body')
}
