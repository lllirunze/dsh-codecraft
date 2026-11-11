/**
 * HTML preview handoff between the native document header and the CodeCraft body.
 *
 * The header action is a DSH list-slot component; the editor body owns the live
 * dirty/save state. This module is the small shared store between them and the
 * optional Session Remote opener.
 *
 * @module dsh-codecraft/client/languages/html/preview
 */

export interface HtmlPreviewState {
  dirty: boolean
  busy: boolean
}

export interface HtmlPreviewController {
  /** Host absolute path this controller belongs to. */
  path: string
  state(): HtmlPreviewState
  /** Begin the guard/save/open flow owned by the editor body. */
  requestPreview(): void
}

export type HtmlPreviewOpener = (path: string) => Promise<boolean>

let opener: HtmlPreviewOpener | undefined
const runtimeListeners = new Set<() => void>()
let runtimeVersion = 0

const controllers = new Map<string, HtmlPreviewController>()
const controllerListeners = new Set<() => void>()
let controllerVersion = 0

function emitRuntime(): void {
  runtimeVersion += 1
  for (const listener of runtimeListeners) listener()
}

function emitControllers(): void {
  controllerVersion += 1
  for (const listener of controllerListeners) listener()
}

/** Bind the public Session Remote path opener for this plugin lifetime. */
export function bindHtmlPreviewOpener(next: HtmlPreviewOpener): () => void {
  opener = next
  emitRuntime()
  return () => {
    if (opener === next) opener = undefined
    emitRuntime()
  }
}

export function previewOpenerAvailable(): boolean {
  return opener !== undefined
}

export function subscribePreviewRuntime(listener: () => void): () => void {
  runtimeListeners.add(listener)
  return () => runtimeListeners.delete(listener)
}

export function previewRuntimeVersion(): number {
  return runtimeVersion
}

/** Open one saved HTML file through the host's default file association. */
export async function openPreviewPath(path: string): Promise<boolean> {
  if (opener === undefined) return false
  try {
    return await opener(path)
  } catch {
    return false
  }
}

/** Register the live editor controller for one absolute path. */
export function setHtmlPreviewController(controller: HtmlPreviewController): () => void {
  const existing = controllers.get(controller.path)
  controllers.set(controller.path, controller)
  if (existing !== controller) emitControllers()
  return () => {
    if (controllers.get(controller.path) !== controller) return
    controllers.delete(controller.path)
    emitControllers()
  }
}

/** Notify the header when dirty or busy state changed. */
export function notifyHtmlPreviewController(): void {
  emitControllers()
}

export function htmlPreviewController(path: string): HtmlPreviewController | undefined {
  return controllers.get(path)
}

export function subscribePreviewControllers(listener: () => void): () => void {
  controllerListeners.add(listener)
  return () => controllerListeners.delete(listener)
}

export function previewControllerVersion(): number {
  return controllerVersion
}

/** Whether this native path belongs to the HTML preview feature. */
export function isHtmlFilePath(path: string): boolean {
  return /\.html?$/i.test(path)
}
