/** Per-editor bridge from HTML editor extensions to the tab body. */

import type { EditorView } from '@codemirror/view'

export interface HtmlFeatureHost {
  /** Current workspace-relative or absolute path of the open document. */
  currentPath(): string
  /** Open one resolved local file in a native DSH resource tab. */
  openFile(path: string): void
  /** Reveal one same-document id target. */
  revealAnchor(from: number, to: number): void
  /** Report one localized navigation or editing failure. */
  report(code: string): void
}

const hosts = new WeakMap<EditorView, HtmlFeatureHost>()

export function bindHtmlFeatureHost(view: EditorView, host: HtmlFeatureHost): void {
  hosts.set(view, host)
}

export function unbindHtmlFeatureHost(view: EditorView): void {
  hosts.delete(view)
}

export function htmlFeatureHost(view: EditorView): HtmlFeatureHost | undefined {
  return hosts.get(view)
}
