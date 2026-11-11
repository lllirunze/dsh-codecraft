/** Native document-header action that previews one saved HTML file. */

import { useSyncExternalStore, type ReactElement } from 'react'
import {
  htmlPreviewController,
  isHtmlFilePath,
  previewControllerVersion,
  previewOpenerAvailable,
  previewRuntimeVersion,
  subscribePreviewControllers,
  subscribePreviewRuntime,
} from '../languages/html/preview.js'

export interface PreviewInBrowserActionProps {
  absolutePath?: string
  t: (key: string, params?: Record<string, string | number>) => string
}

/**
 * Render only for the active CodeCraft HTML editor and the public Session
 * Remote opener. The action is a real button inside the native document header.
 */
export function PreviewInBrowserAction(props: PreviewInBrowserActionProps): ReactElement | null {
  useSyncExternalStore(subscribePreviewControllers, previewControllerVersion, previewControllerVersion)
  useSyncExternalStore(subscribePreviewRuntime, previewRuntimeVersion, previewRuntimeVersion)
  const path = props.absolutePath
  if (path === undefined || !isHtmlFilePath(path) || !previewOpenerAvailable()) return null
  const controller = htmlPreviewController(path)
  if (controller === undefined) return null
  const state = controller.state()
  const label = state.busy ? props.t('preview.opening') : props.t('preview.label')
  return (
    <button
      type="button"
      className="dsh-codecraft-preview-action"
      aria-label={label}
      title={props.t('preview.hint')}
      disabled={state.busy}
      onClick={() => controller.requestPreview()}
    >
      <span>{label}</span>
      <span className="dsh-codecraft-preview-action-icon" aria-hidden="true">↗</span>
    </button>
  )
}
