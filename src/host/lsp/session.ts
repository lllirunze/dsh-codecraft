import { pathToFileURL } from 'node:url'
import type { ManagedSubprocessService } from '../context.js'
import type {
  IntelligenceCompletionItem,
  IntelligenceCompletionResult,
  IntelligenceHoverResult,
  IntelligenceMarkup,
  IntelligencePosition,
  IntelligenceRange,
  IntelligenceTextEdit,
} from '../../protocol.js'
import { LspConnection } from './connection.js'

export class LspSessionRetiredError extends Error {
  constructor() {
    super('Intelligence session was retired')
    this.name = 'LspSessionRetiredError'
  }
}

export interface LspSessionOptions {
  languageId?: string
  initializationOptions?: unknown
  workspaceSettings?: unknown
  clientVersion?: string
  initializeTimeoutMs?: number
}

interface OpenDocument {
  target: string
  tabId: string
  revision: number
  content: string
}

export interface SyncedDocument {
  target: string
  tabId: string
  revision: number
  content: string
}

export type LspNavigationCapability = 'hover' | 'definition' | 'references'

export interface LspLocation {
  uri: string
  range: IntelligenceRange
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function position(value: unknown): IntelligencePosition | undefined {
  if (!isRecord(value)) return undefined
  const { line, character } = value
  if (!Number.isInteger(line) || !Number.isInteger(character) || Number(line) < 0 || Number(character) < 0) {
    return undefined
  }
  return { line: Number(line), character: Number(character) }
}

function range(value: unknown): IntelligenceRange | undefined {
  if (!isRecord(value)) return undefined
  const start = position(value.start)
  const end = position(value.end)
  return start === undefined || end === undefined ? undefined : { start, end }
}

function textEdit(value: unknown): IntelligenceTextEdit | undefined {
  if (!isRecord(value) || typeof value.newText !== 'string') return undefined
  const editRange = range(value.range)
  return editRange === undefined ? undefined : { range: editRange, newText: value.newText }
}

function completionItem(value: unknown): IntelligenceCompletionItem | undefined {
  if (!isRecord(value) || typeof value.label !== 'string') return undefined
  const item: IntelligenceCompletionItem = { label: value.label }
  if (typeof value.kind === 'number') item.kind = value.kind
  if (typeof value.detail === 'string') item.detail = value.detail
  if (typeof value.sortText === 'string') item.sortText = value.sortText
  if (typeof value.filterText === 'string') item.filterText = value.filterText
  if (typeof value.insertText === 'string') item.insertText = value.insertText
  if (value.insertTextFormat === 1 || value.insertTextFormat === 2) item.insertTextFormat = value.insertTextFormat
  const edit = textEdit(value.textEdit)
  if (edit !== undefined) item.textEdit = edit
  if (Array.isArray(value.additionalTextEdits)) {
    const edits = value.additionalTextEdits.map(textEdit).filter(editValue => editValue !== undefined)
    if (edits.length > 0) item.additionalTextEdits = edits
  }
  return item
}

function completionItems(value: unknown): IntelligenceCompletionItem[] {
  const values = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.items)
      ? value.items
      : []
  return values.map(completionItem).filter(item => item !== undefined).slice(0, 500)
}

function markup(value: unknown): IntelligenceMarkup | undefined {
  if (typeof value === 'string') return value === '' ? undefined : { kind: 'plaintext', value }
  if (isRecord(value) && typeof value.value === 'string'
    && (value.kind === 'plaintext' || value.kind === 'markdown')) {
    return value.value === '' ? undefined : { kind: value.kind, value: value.value }
  }
  if (!Array.isArray(value)) return undefined
  const parts: string[] = []
  for (const part of value) {
    if (typeof part === 'string') parts.push(part)
    else if (isRecord(part) && typeof part.value === 'string') {
      parts.push(typeof part.language === 'string'
        ? `\`\`\`${part.language}\n${part.value}\n\`\`\``
        : part.value)
    }
  }
  return parts.length === 0 ? undefined : { kind: 'markdown', value: parts.join('\n\n') }
}

function hoverResult(value: unknown, revision: number): IntelligenceHoverResult {
  if (!isRecord(value)) return { revision }
  const contents = markup(value.contents)
  const hoverRange = range(value.range)
  return {
    revision,
    ...(contents === undefined ? {} : { contents }),
    ...(hoverRange === undefined ? {} : { range: hoverRange }),
  }
}

function location(value: unknown): LspLocation | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.uri === 'string') {
    const locationRange = range(value.range)
    return locationRange === undefined ? undefined : { uri: value.uri, range: locationRange }
  }
  if (typeof value.targetUri === 'string') {
    const targetRange = range(value.targetSelectionRange) ?? range(value.targetRange)
    return targetRange === undefined ? undefined : { uri: value.targetUri, range: targetRange }
  }
  return undefined
}

function locations(value: unknown): LspLocation[] {
  const values = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value]
  return values.map(location).filter(item => item !== undefined).slice(0, 1000)
}

/** Long-lived interactive LSP session shared by one language in one workspace. */
export class LspSession {
  readonly #connection: LspConnection
  readonly #documents = new Map<string, OpenDocument>()
  #ready: Promise<void>
  #capabilities = new Set<LspNavigationCapability>()
  #disposed = false

  constructor(
    subprocess: ManagedSubprocessService,
    readonly workspace: string,
    argv: readonly string[],
    readonly interpreterPath: string | undefined,
    readonly options: LspSessionOptions = {},
  ) {
    this.#connection = LspConnection.start(subprocess, {
      argv,
      cwd: workspace,
      ...(interpreterPath === undefined ? {} : { pythonPath: interpreterPath }),
      workspaceSettings: options.workspaceSettings,
    })
    this.#ready = this.#initialize()
  }

  /** Resolve only after the language server has completed LSP initialization. */
  async ready(): Promise<void> {
    await this.#ready
  }

  async sync(target: string, tabId: string, revision: number, content: string): Promise<void> {
    await this.#ready
    if (this.#disposed) throw new LspSessionRetiredError()
    const uri = pathToFileURL(target).href
    const current = this.#documents.get(uri)
    if (current !== undefined && current.tabId === tabId
      && (revision < current.revision || (revision === current.revision && content !== current.content))) {
      throw new Error('stale document revision')
    }
    if (current === undefined || current.tabId !== tabId) {
      if (current !== undefined) {
        this.#connection.notify('textDocument/didClose', { textDocument: { uri } })
      }
      this.#connection.notify('textDocument/didOpen', {
        textDocument: { uri, languageId: this.options.languageId ?? 'python', version: revision, text: content },
      })
    } else if (current.revision !== revision || current.content !== content) {
      this.#connection.notify('textDocument/didChange', {
        textDocument: { uri, version: revision },
        contentChanges: [{ text: content }],
      })
    }
    this.#documents.set(uri, { target, tabId, revision, content })
  }

  /** Capture editor-owned documents so a replacement server can reopen them. */
  documents(): readonly SyncedDocument[] {
    return [...this.#documents.values()].map(document => ({ ...document }))
  }

  /** Whether at least one current editor generation is owned by this session. */
  hasDocuments(): boolean {
    return this.#documents.size > 0
  }

  supports(capability: LspNavigationCapability): boolean {
    return this.#capabilities.has(capability)
  }

  contentFor(target: string): string | undefined {
    return this.#documents.get(pathToFileURL(target).href)?.content
  }

  async hover(
    target: string,
    tabId: string,
    revision: number,
    content: string,
    cursor: IntelligencePosition,
    signal?: AbortSignal,
  ): Promise<IntelligenceHoverResult> {
    await this.sync(target, tabId, revision, content)
    if (!this.supports('hover')) return { revision }
    const result = await this.#request('textDocument/hover', target, cursor, signal)
    this.#assertCurrent(target, tabId, revision)
    return hoverResult(result, revision)
  }

  async definition(
    target: string,
    tabId: string,
    revision: number,
    content: string,
    cursor: IntelligencePosition,
    signal?: AbortSignal,
  ): Promise<LspLocation[]> {
    await this.sync(target, tabId, revision, content)
    if (!this.supports('definition')) return []
    const result = await this.#request('textDocument/definition', target, cursor, signal)
    this.#assertCurrent(target, tabId, revision)
    return locations(result)
  }

  async references(
    target: string,
    tabId: string,
    revision: number,
    content: string,
    cursor: IntelligencePosition,
    signal?: AbortSignal,
  ): Promise<LspLocation[]> {
    await this.sync(target, tabId, revision, content)
    if (!this.supports('references')) return []
    const uri = pathToFileURL(target).href
    const timeout = AbortSignal.timeout(10_000)
    const requestSignal = signal === undefined ? timeout : AbortSignal.any([signal, timeout])
    const result = await this.#connection.request<unknown>('textDocument/references', {
      textDocument: { uri },
      position: cursor,
      context: { includeDeclaration: false },
    }, requestSignal)
    this.#assertCurrent(target, tabId, revision)
    return locations(result)
  }

  async complete(
    target: string,
    tabId: string,
    revision: number,
    content: string,
    cursor: IntelligencePosition,
    signal?: AbortSignal,
  ): Promise<IntelligenceCompletionResult> {
    await this.sync(target, tabId, revision, content)
    const uri = pathToFileURL(target).href
    const timeout = AbortSignal.timeout(10_000)
    const completionSignal = signal === undefined ? timeout : AbortSignal.any([signal, timeout])
    const result = await this.#connection.request<unknown>('textDocument/completion', {
      textDocument: { uri },
      position: cursor,
      context: { triggerKind: 1 },
    }, completionSignal)
    const current = this.#documents.get(uri)
    if (current === undefined || current.tabId !== tabId || current.revision !== revision) {
      throw new Error('stale document revision')
    }
    return { revision, items: completionItems(result) }
  }

  async #request(
    method: 'textDocument/hover' | 'textDocument/definition',
    target: string,
    cursor: IntelligencePosition,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const timeout = AbortSignal.timeout(10_000)
    const requestSignal = signal === undefined ? timeout : AbortSignal.any([signal, timeout])
    return this.#connection.request(method, {
      textDocument: { uri: pathToFileURL(target).href },
      position: cursor,
    }, requestSignal)
  }

  #assertCurrent(target: string, tabId: string, revision: number): void {
    const current = this.#documents.get(pathToFileURL(target).href)
    if (current === undefined || current.tabId !== tabId || current.revision !== revision) {
      throw new Error('stale document revision')
    }
  }

  async close(target: string, tabId: string): Promise<void> {
    await this.#ready.catch(() => undefined)
    if (this.#disposed) return
    const uri = pathToFileURL(target).href
    const current = this.#documents.get(uri)
    if (current === undefined || current.tabId !== tabId) return
    this.#documents.delete(uri)
    try {
      this.#connection.notify('textDocument/didClose', { textDocument: { uri } })
    } catch {
      // The manager still needs to retire a failed session.
    }
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return
    this.#disposed = true
    await this.#ready.catch(() => undefined)
    for (const uri of this.#documents.keys()) {
      this.#connection.notify('textDocument/didClose', { textDocument: { uri } })
    }
    this.#documents.clear()
    await this.#connection.dispose()
  }

  async #initialize(): Promise<void> {
    const rootUri = pathToFileURL(this.workspace).href
    const initialized = await this.#connection.request<unknown>('initialize', {
      processId: null,
      clientInfo: { name: 'DSH CodeCraft', version: this.options.clientVersion ?? '0.3.0' },
      rootUri,
      workspaceFolders: [{ uri: rootUri, name: this.workspace.split(/[\\/]/).at(-1) ?? 'workspace' }],
      capabilities: {
        workspace: { configuration: true, workspaceFolders: true },
        general: { positionEncodings: ['utf-16'] },
        textDocument: {
          synchronization: { dynamicRegistration: false, didSave: false },
          completion: {
            dynamicRegistration: false,
            contextSupport: true,
            completionItem: {
              snippetSupport: true,
              commitCharactersSupport: false,
              documentationFormat: ['markdown', 'plaintext'],
              insertReplaceSupport: false,
            },
          },
          hover: { dynamicRegistration: false, contentFormat: ['markdown', 'plaintext'] },
          definition: { dynamicRegistration: false, linkSupport: true },
          references: { dynamicRegistration: false },
        },
      },
      initializationOptions: this.options.initializationOptions ?? {},
    }, AbortSignal.timeout(this.options.initializeTimeoutMs ?? 15_000))
    if (isRecord(initialized) && isRecord(initialized.capabilities)) {
      const capabilities = initialized.capabilities
      if (capabilities.hoverProvider === true || isRecord(capabilities.hoverProvider)) this.#capabilities.add('hover')
      if (capabilities.definitionProvider === true || isRecord(capabilities.definitionProvider)) this.#capabilities.add('definition')
      if (capabilities.referencesProvider === true || isRecord(capabilities.referencesProvider)) this.#capabilities.add('references')
    }
    this.#connection.notify('initialized', {})
    this.#connection.notify('workspace/didChangeConfiguration', {
      settings: this.options.workspaceSettings ?? null,
    })
  }
}
