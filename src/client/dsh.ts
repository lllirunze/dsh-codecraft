/**
 * Minimal structural declarations for the DSH browser services CodeCraft uses.
 *
 * These are the public contracts described by DSH's document-preview and slot
 * packages. Declaring them locally keeps this plugin a normal independent
 * package instead of importing another package's private build output.
 *
 * @module dsh-codecraft/client/dsh
 */

/** Locale dictionary registration and lookup. */
export interface LocaleService {
  register(
    namespace: string,
    dictionaries: { zh: Record<string, string>; en: Record<string, string> },
  ): () => void
  bind(namespace: string): (key: string, params?: Record<string, string | number>) => string
}

/** One file-preview implementation, registered by suffix. */
export interface DocumentPreviewDefinition {
  id: string
  extensions: readonly string[]
  binaryExtensions?: readonly string[]
  priority?: 'extension' | 'builtin' | 'fallback'
  title: () => string
  loading: 'text-pages' | 'bytes-complete' | 'renderer'
  wrap?: boolean
}

export interface DocumentPreviewsService {
  register(definition: DocumentPreviewDefinition): () => void
}

export interface SlotRegisterOptions {
  name: string
  key?: string
  id?: string
  order?: number
  label?: () => string
  locale?: string
  store?: unknown
  inject?: (...args: never[]) => Record<string, unknown>
  children?: Record<string, unknown>
}

export interface SlotsService {
  register(options: SlotRegisterOptions, component: unknown): () => void
  inject(name: string, callback: () => () => void): () => void
}

export interface ConfigFormSnapshot {
  status: 'loading' | 'ready' | 'unavailable'
  value?: unknown
  writable: boolean
}

export interface ConfigFormService {
  getSnapshot(): ConfigFormSnapshot
  subscribe(listener: () => void): () => void
  mutate(operations: Array<{
    op: 'set' | 'unset'
    path: string[]
    value?: unknown
  }>): Promise<boolean>
}

export interface ConfigFormsService {
  get(entryId: string): ConfigFormService
  whileServed(namespaces: string[], register: (served: Set<string>) => () => void): () => void
}

export interface SidebarRightService {
  openResource(address: string, options?: {
    params?: Record<string, unknown>
    revealIfOpened?: boolean
    preferNewPane?: boolean
  }): void
}

/** The Cordis browser context this plugin consumes. */
export interface ClientContext {
  documentPreviews: DocumentPreviewsService
  slots: SlotsService
  locale: LocaleService
  configForms: ConfigFormsService
  sidebarRight: SidebarRightService
  effect(callback: () => (() => void) | void, label?: string): void
}

/** Tab identity and lifecycle handed to every document body. */
export interface TabInfo {
  id: string
  contentId: string
  title: string
  visible: boolean
  signal: AbortSignal
  navigation: {
    revision: number
    params?: {
      line?: number
      character?: number
      endLine?: number
      endCharacter?: number
      codecraftNavigationId?: string
      codecraftNavigationPath?: string
      codecraftNavigationExcerpt?: string
    } & Record<string, unknown>
  }
}

/** Resource metadata the document type already follows. */
export interface ResourceSnapshot {
  status: 'none' | 'loading' | 'live' | 'failed'
  value?: { version?: string; absolutePath?: string; bytes?: number }
  failure?: { code?: string; message?: string }
}

/** Content passed to a `loading: 'renderer'` implementation. */
export interface RendererRequest {
  kind: 'renderer'
  revision: number
  /** Ask DSH for a fresh revision (header reload / external change refresh). */
  reload: () => void
  /** End loading and record the version now displayed. */
  loaded: (version: string) => void
  /** End loading without recording a version, so a later change can retry. */
  failed: () => void
}

export type DocumentContent =
  | RendererRequest
  | { kind: 'text'; text: string; pages: readonly unknown[]; eof: boolean }
  | { kind: 'bytes'; data: Uint8Array }

/** Props the native document-preview slot passes to its selected renderer. */
export interface DocumentBodyProps {
  resourceAddress: string
  content: DocumentContent
  wrap: boolean
  scrollportRef: (element: HTMLElement | null) => void
  addResource: (address: string) => void
  setResources: (addresses: string[]) => void
  useTabInfo: () => { tab: TabInfo }
  useResource: (address: string) => ResourceSnapshot
  t: (key: string, params?: Record<string, string | number>) => string
}
