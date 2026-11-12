/**
 * DSH CodeCraft — browser half.
 *
 * Registers one document-preview implementation for source and text files.
 * DSH's native file tree and file tab stay in charge of opening, switching,
 * closing, and the viewer menu; CodeCraft only supplies the tab body.
 *
 * @module dsh-codecraft/client
 */

import type { ClientContext } from '../dsh.js'
import { CodeCraftBody } from '../renderer/CodeCraftBody.js'
import { CodeCraftSettingsCard } from '../settings/CodeCraftSettingsCard.js'
import { editorSettings } from '../settings/editor-settings.js'
import { EDITOR_EXTENSIONS } from '../languages/index.js'
import { en, zh } from '../locales.js'
import { CODECRAFT_CSS } from '../theme.js'
import { navigationCoordinator } from '../navigation/coordinator.js'
import { PreviewInBrowserAction } from '../renderer/PreviewInBrowserAction.js'
import { bindHtmlPreviewOpener } from '../languages/html/preview.js'
import { clearBrowserLegacyDrafts } from '../drafts.js'

/** Browser services required before mounting. */
export const inject = ['documentPreviews', 'slots', 'locale', 'configForms', 'sidebarRight']

/** Locale namespace bound to both the viewer label and the body copy. */
const LOCALE_NAMESPACE = 'sidebarCodeCraft'

/** Unique identity in DSH's preview registry and the keyed body slot. */
const PREVIEW_ID = 'dsh-codecraft'

/** Loader entry id from cordis.patch.yml; DSH settings are keyed by this id. */
const SETTINGS_ENTRY_ID = 'codecraft'

/**
 * Register the editor for this plugin's lifetime.
 * @param ctx - browser context carrying the preview registry, slots, and copy.
 */
export function apply(ctx: ClientContext): void {
  clearBrowserLegacyDrafts()
  ctx.effect(
    () => navigationCoordinator.bind(ctx.sidebarRight),
    'dsh-codecraft: native navigation',
  )
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.dshCodecraft = '0.1.4'
    style.textContent = CODECRAFT_CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, 'dsh-codecraft: editor theme')

  ctx.effect(
    () => ctx.locale.register(LOCALE_NAMESPACE, { zh, en }),
    'dsh-codecraft: dictionaries',
  )
  const t = ctx.locale.bind(LOCALE_NAMESPACE)

  ctx.effect(
    () => editorSettings.bind(ctx.configForms.get(SETTINGS_ENTRY_ID)),
    'dsh-codecraft: editor settings',
  )

  ctx.effect(() => ctx.configForms.whileServed([SETTINGS_ENTRY_ID], () => ctx.slots.inject(
    'plugins.item',
    () => ctx.slots.register({
      name: 'plugins.item',
      id: PREVIEW_ID,
      order: 50,
      label: () => t('settings.title'),
      locale: LOCALE_NAMESPACE,
    }, CodeCraftSettingsCard),
  )), 'dsh-codecraft: settings page')

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

  // The native document header owns the file-level action area. The action
  // renders only while this plugin's HTML body has registered a controller.
  ctx.effect(() => ctx.slots.inject('sidebar.right.tab.document.actions', () => ctx.slots.register({
    name: 'sidebar.right.tab.document.actions',
    id: 'dsh-codecraft-html-preview',
    order: 40,
    locale: LOCALE_NAMESPACE,
  }, PreviewInBrowserAction)), 'dsh-codecraft: HTML preview action')

  // Preview uses DSH's public Session Remote path opener. A deployment without
  // the service keeps the editor and every other HTML feature.
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['remote', 'remote.session'], child => {
    const session = child.remote?.session
    if (session === undefined) return
    child.effect(() => bindHtmlPreviewOpener(async path => {
      try {
        const result = await session.openWorkspacePath({ path })
        return result.ok && result.value.opened
      } catch {
        return false
      }
    }), 'dsh-codecraft: default-browser preview')
  })
}
