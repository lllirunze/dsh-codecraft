import { pathToFileURL } from 'node:url'
import type { ManagedSubprocessService } from '../context.js'
import type {
  IntelligenceCompletionItem,
  IntelligenceCompletionResult,
  IntelligencePosition,
  IntelligenceRange,
  IntelligenceTextEdit,
} from '../../protocol.js'
import { LspConnection } from './connection.js'

export class LspSessionRetiredError extends Error {
  constructor() {
    super('Python intelligence session was retired')
    this.name = 'LspSessionRetiredError'
  }
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

/** Long-lived interactive LSP session shared by Python tabs in one workspace. */
export class LspSession {
  readonly #connection: LspConnection
  readonly #documents = new Map<string, OpenDocument>()
  #ready: Promise<void>
  #disposed = false

  constructor(
    subprocess: ManagedSubprocessService,
    readonly workspace: string,
    argv: readonly string[],
    readonly interpreterPath: string | undefined,
  ) {
    this.#connection = LspConnection.start(subprocess, {
      argv,
      cwd: workspace,
      ...(interpreterPath === undefined ? {} : { pythonPath: interpreterPath }),
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
        textDocument: { uri, languageId: 'python', version: revision, text: content },
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
    await this.#connection.request('initialize', {
      processId: null,
      clientInfo: { name: 'DSH CodeCraft', version: '0.2.2' },
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
        },
      },
      initializationOptions: {},
    }, AbortSignal.timeout(15_000))
    this.#connection.notify('initialized', {})
    this.#connection.notify('workspace/didChangeConfiguration', { settings: null })
  }
}
