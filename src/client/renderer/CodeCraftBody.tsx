/**
 * The body DSH renders inside a native file tab for source and text files.
 *
 * It owns three things and nothing else: loading the complete file through the
 * Host save adapter, the CodeMirror editor, and draft/conflict state. The tab,
 * file tree, viewer menu, and tab lifecycle stay native.
 *
 * @module dsh-codecraft/client/body
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
} from 'react'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, type ViewUpdate } from '@codemirror/view'
import {
  ApiCallError,
  closeIntelligence,
  readFile,
  saveFile,
  statFile,
  syncIntelligence,
} from '../api.js'
import { fileNameOf, parseSessionFileAddress } from '../address.js'
import { drafts } from '../drafts.js'
import {
  applyTextPreservingSelection,
  buildEditorExtensions,
  cursorPosition,
  revealLine,
  setEditorIndentation,
  setEditorReadOnly,
} from '../editor/index.js'
import { semanticCompletionSource } from '../editor/extensions/semantic-completion.js'
import { languageForFile } from '../languages/index.js'
import { ROOT_CLASS } from '../theme.js'
import type { DocumentBodyProps, RendererRequest } from '../dsh.js'
import { assessDiskChange } from '../document/conflicts.js'
import { autoSaveDelay, canAutoSave } from '../document/auto-save.js'
import { createSaveRequest, reconcileSaveSuccess } from '../document/save.js'
import { differsFromSavedText, initialDocumentState } from '../document/state.js'
import { editorSettings } from '../settings/editor-settings.js'
import type {
  IntelligenceStatusKind,
  TextFileSnapshot,
  UnsupportedFileSnapshot,
} from '../../protocol.js'

type Phase = 'loading' | 'editing' | 'notice' | 'error'
type Status = 'idle' | 'saving' | 'saved' | 'error'
type ConflictKind = 'external' | 'save' | 'restored' | 'deleted'
type ErrorKind = 'save' | 'load' | 'copy' | 'readOnly'

interface Conflict {
  kind: ConflictKind
}

interface Notice {
  title: string
  detail: string
  reason?: UnsupportedFileSnapshot['reason']
}

interface UiError {
  kind: ErrorKind
  message: string
}

interface InitialEditor {
  text: string
  readOnly: boolean
  selection?: { anchor: number, head: number }
  scrollTop?: number
}

interface BannerAction {
  label: string
  variant?: 'primary' | 'quiet'
  onClick: () => void
}

function messageOf(error: unknown): string {
  if (error instanceof ApiCallError) return error.message
  if (error instanceof Error) return error.message
  return String(error)
}

function unsupportedNotice(
  result: UnsupportedFileSnapshot,
  hasDraft: boolean,
  t: DocumentBodyProps['t'],
): Notice {
  const reasonTitle: Record<UnsupportedFileSnapshot['reason'], string> = {
    'too-large': 'notice.tooLarge.title',
    binary: 'notice.binary.title',
    encoding: 'notice.encoding.title',
    newline: 'notice.newline.title',
  }
  const reasonDetail: Record<UnsupportedFileSnapshot['reason'], string> = {
    'too-large': 'notice.tooLarge.detail',
    binary: 'notice.binary.detail',
    encoding: 'notice.encoding.detail',
    newline: 'notice.newline.detail',
  }
  const detail = t(reasonDetail[result.reason])
  return {
    title: t(reasonTitle[result.reason]),
    detail: hasDraft ? `${detail} ${t('notice.draftRetained')}` : detail,
    reason: result.reason,
  }
}

export function CodeCraftBody(props: DocumentBodyProps): ReactElement | null {
  const settings = useSyncExternalStore(
    editorSettings.subscribe,
    editorSettings.getSnapshot,
    editorSettings.getSnapshot,
  ).settings
  const autoSaveSettings = settings.autoSave
  const indentationSettings = settings.indentation
  const pythonIntelligenceSettings = useSyncExternalStore(
    editorSettings.subscribe,
    editorSettings.getSnapshot,
    editorSettings.getSnapshot,
  ).pythonIntelligence
  const javaIntelligenceSettings = useSyncExternalStore(
    editorSettings.subscribe,
    editorSettings.getSnapshot,
    editorSettings.getSnapshot,
  ).javaIntelligence
  const { tab } = props.useTabInfo()
  const request = props.content.kind === 'renderer' ? props.content : undefined
  const useResource = props.useResource ?? (() => ({ status: 'none' as const }))
  const meta = useResource(tab.contentId)
  const t = props.t ?? ((key: string) => key)
  const tRef = useRef(t)
  tRef.current = t

  const address = props.resourceAddress
  const addressRef = useRef(address)
  addressRef.current = address
  const propsRef = useRef(props)
  propsRef.current = props
  const requestRef = useRef<RendererRequest | undefined>(request)
  requestRef.current = request
  const metaVersionRef = useRef<string | undefined>(undefined)
  metaVersionRef.current = meta.status === 'live' ? meta.value?.version : undefined

  const rootRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const readOnlyCompartmentRef = useRef(new Compartment())
  const indentationCompartmentRef = useRef(new Compartment())
  const indentationSettingsRef = useRef(indentationSettings)
  indentationSettingsRef.current = indentationSettings
  const pythonIntelligenceSettingsRef = useRef(pythonIntelligenceSettings)
  pythonIntelligenceSettingsRef.current = pythonIntelligenceSettings
  const javaIntelligenceSettingsRef = useRef(javaIntelligenceSettings)
  javaIntelligenceSettingsRef.current = javaIntelligenceSettings
  const savedTextRef = useRef('')
  const baseVersionRef = useRef('')
  const newlineRef = useRef<'lf' | 'crlf'>('lf')
  const bomRef = useRef(false)
  const dirtyRef = useRef(false)
  const readOnlyRef = useRef(false)
  const savingRef = useRef(false)
  const saveQueuedRef = useRef(false)
  const doSaveRef = useRef<() => Promise<void>>(async () => {})
  const conflictRef = useRef<Conflict | null>(null)
  const parsedRef = useRef<{ sessionId: string, path: string } | null>(null)
  const mountedRef = useRef(true)
  const initialisedRef = useRef(false)
  const cursorFrameRef = useRef(0)
  const draftTimerRef = useRef<number | undefined>(undefined)
  const flashTimerRef = useRef<number | undefined>(undefined)
  const copyTimerRef = useRef<number | undefined>(undefined)
  const intelligenceTimerRef = useRef<number | undefined>(undefined)
  const intelligenceRevisionRef = useRef(1)
  const intelligenceGenerationRef = useRef(0)
  const intelligenceDocumentIdRef = useRef<string | undefined>(undefined)
  const syncIntelligenceDocumentRef = useRef<() => Promise<void>>(async () => {})

  const [phase, setPhase] = useState<Phase>('loading')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [error, setError] = useState<UiError | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [dirty, setDirty] = useState(false)
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [external, setExternal] = useState(false)
  const [cursor, setCursor] = useState({ line: 1, column: 1 })
  const [indentSize, setIndentSize] = useState(indentationSettings.indentSize)
  const [readOnly, setReadOnly] = useState(false)
  const [languageLabel, setLanguageLabel] = useState('纯文本')
  const [fileWritable, setFileWritable] = useState(true)
  const [newlineStyle, setNewlineStyle] = useState<'lf' | 'crlf'>('lf')
  const [copied, setCopied] = useState(false)
  const [intelligenceStatus, setIntelligenceStatus] = useState<IntelligenceStatusKind>('disabled')
  const [intelligenceMessage, setIntelligenceMessage] = useState<string | undefined>(undefined)
  const [intelligenceLanguage, setIntelligenceLanguage] = useState<'python' | 'java'>('python')

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    readOnlyRef.current = readOnly
  }, [readOnly])

  useEffect(() => {
    setIndentSize(indentationSettings.indentSize)
    const view = viewRef.current
    if (view !== null) {
      setEditorIndentation(view, indentationCompartmentRef.current, indentationSettings)
    }
  }, [indentationSettings.indentSize])

  useEffect(() => {
    if (viewRef.current !== null) void syncIntelligenceDocumentRef.current()
  }, [
    pythonIntelligenceSettings.enabled,
    pythonIntelligenceSettings.completion,
    pythonIntelligenceSettings.interpreterPath,
    pythonIntelligenceSettings.serverPath,
    javaIntelligenceSettings.enabled,
    javaIntelligenceSettings.completion,
    javaIntelligenceSettings.serverRuntimePath,
    javaIntelligenceSettings.projectRuntimePath,
    javaIntelligenceSettings.serverPath,
  ])

  useEffect(() => {
    conflictRef.current = conflict
  }, [conflict])

  const flushDraft = useCallback(() => {
    const view = viewRef.current
    if (view === null) return
    const fileAddress = addressRef.current
    if (!dirtyRef.current) {
      drafts.remove(fileAddress)
      return
    }
    const content = view.state.doc.toString()
    if (content === savedTextRef.current) {
      drafts.remove(fileAddress)
      return
    }
    const selection = view.state.selection.main
    drafts.put(fileAddress, {
      content,
      baseVersion: baseVersionRef.current,
      newline: newlineRef.current,
      bom: bomRef.current,
      savedAt: Date.now(),
      selection: { anchor: selection.anchor, head: selection.head },
      scrollTop: view.scrollDOM.scrollTop,
    })
  }, [])

  const destroyEditor = useCallback(() => {
    const view = viewRef.current
    if (view === null) return
    const parsed = parsedRef.current
    const documentId = intelligenceDocumentIdRef.current
    intelligenceDocumentIdRef.current = undefined
    if (intelligenceTimerRef.current !== undefined) {
      window.clearTimeout(intelligenceTimerRef.current)
      intelligenceTimerRef.current = undefined
    }
    flushDraft()
    viewRef.current = null
    try {
      propsRef.current.scrollportRef(null)
    } catch {
      // The owner may already have released its callback ref.
    }
    view.destroy()
    if (parsed !== null && documentId !== undefined) {
      void closeIntelligence({
        sessionId: parsed.sessionId,
        path: parsed.path,
        tabId: documentId,
      }).catch(() => undefined)
    }
  }, [flushDraft])

  const syncDirty = useCallback((view: EditorView) => {
    const next = differsFromSavedText(view.state.doc.toString(), savedTextRef.current)
    if (next !== dirtyRef.current) {
      dirtyRef.current = next
      if (mountedRef.current) setDirty(next)
    }
    if (!next) drafts.remove(addressRef.current)
    return next
  }, [])

  const scheduleDraft = useCallback(() => {
    if (draftTimerRef.current !== undefined) window.clearTimeout(draftTimerRef.current)
    draftTimerRef.current = window.setTimeout(() => {
      draftTimerRef.current = undefined
      flushDraft()
    }, 700)
  }, [flushDraft])

  const syncIntelligenceDocument = useCallback(async (): Promise<void> => {
    const parsed = parsedRef.current
    const view = viewRef.current
    const documentId = intelligenceDocumentIdRef.current
    const python = parsed !== null && /\.(?:py|pyi|pyw)$/i.test(parsed.path)
    const java = parsed !== null && /\.java$/i.test(parsed.path)
    const enabled = (python
      && pythonIntelligenceSettingsRef.current.enabled
      && pythonIntelligenceSettingsRef.current.completion)
      || (java
        && javaIntelligenceSettingsRef.current.enabled
        && javaIntelligenceSettingsRef.current.completion)
    if (!enabled || parsed === null || view === null || documentId === undefined) {
      if (mountedRef.current) setIntelligenceStatus('disabled')
      return
    }
    if (mountedRef.current) {
      setIntelligenceStatus('starting')
      setIntelligenceMessage(undefined)
      setIntelligenceLanguage(java ? 'java' : 'python')
    }
    try {
      const result = await syncIntelligence({
        sessionId: parsed.sessionId,
        path: parsed.path,
        tabId: documentId,
        revision: intelligenceRevisionRef.current,
        content: view.state.doc.toString(),
      })
      if (!mountedRef.current || intelligenceDocumentIdRef.current !== documentId) return
      setIntelligenceStatus(result.status)
      setIntelligenceMessage(result.message)
    } catch (failure) {
      if (!mountedRef.current || intelligenceDocumentIdRef.current !== documentId) return
      const apiFailure = failure instanceof ApiCallError ? failure : undefined
      setIntelligenceStatus(apiFailure?.code === 'intelligence-disabled' ? 'disabled' : 'unavailable')
      setIntelligenceMessage(messageOf(failure))
    }
  }, [])
  syncIntelligenceDocumentRef.current = syncIntelligenceDocument

  const onUpdate = useCallback((update: ViewUpdate) => {
    if (update.docChanged) {
      syncDirty(update.view)
      scheduleDraft()
      intelligenceRevisionRef.current += 1
      if (intelligenceTimerRef.current !== undefined) window.clearTimeout(intelligenceTimerRef.current)
      intelligenceTimerRef.current = window.setTimeout(() => {
        intelligenceTimerRef.current = undefined
        void syncIntelligenceDocument()
      }, 150)
    }
    if (update.docChanged || update.selectionSet) {
      if (cursorFrameRef.current !== 0) return
      cursorFrameRef.current = window.requestAnimationFrame(() => {
        cursorFrameRef.current = 0
        const view = viewRef.current
        if (view !== null && mountedRef.current) setCursor(cursorPosition(view))
      })
    }
  }, [scheduleDraft, syncDirty, syncIntelligenceDocument])

  const createEditor = useCallback((initial: InitialEditor): boolean => {
    const host = hostRef.current
    if (host === null) return false
    if (viewRef.current !== null) return true
    const language = languageForFile(fileNameOf(parsedRef.current?.path ?? ''))
    const completionSource = language.id === 'python' || language.id === 'java'
      ? semanticCompletionSource({
          getInput: () => {
            const parsed = parsedRef.current
            const view = viewRef.current
            const documentId = intelligenceDocumentIdRef.current
            if (parsed === null || view === null || documentId === undefined) return undefined
            return {
              sessionId: parsed.sessionId,
              path: parsed.path,
              tabId: documentId,
              revision: intelligenceRevisionRef.current,
              content: view.state.doc.toString(),
              enabled: language.id === 'python'
                ? pythonIntelligenceSettingsRef.current.enabled && pythonIntelligenceSettingsRef.current.completion
                : javaIntelligenceSettingsRef.current.enabled && javaIntelligenceSettingsRef.current.completion,
            }
          },
          onReady: () => {
            if (mountedRef.current) {
              setIntelligenceStatus('ready')
              setIntelligenceMessage(undefined)
            }
          },
          onError: (message) => {
            if (mountedRef.current) {
              setIntelligenceStatus('unavailable')
              setIntelligenceMessage(message)
            }
          },
        })
      : undefined
    const state = EditorState.create({
      doc: initial.text,
      extensions: buildEditorExtensions({
        language,
        indentation: indentationSettingsRef.current,
        readOnly: initial.readOnly,
        readOnlyCompartment: readOnlyCompartmentRef.current,
        indentationCompartment: indentationCompartmentRef.current,
        onUpdate,
        ...(completionSource === undefined ? {} : { completionSource }),
      }),
    })
    const view = new EditorView({ state, parent: host })
    viewRef.current = view
    intelligenceRevisionRef.current = 1
    intelligenceGenerationRef.current += 1
    intelligenceDocumentIdRef.current = `${tab.id}:${intelligenceGenerationRef.current}`
    initialisedRef.current = true
    readOnlyRef.current = initial.readOnly
    try {
      propsRef.current.scrollportRef(view.scrollDOM)
    } catch {
      // Ignore a released callback ref.
    }
    if (initial.selection !== undefined) {
      const limit = view.state.doc.length
      view.dispatch({
        selection: {
          anchor: Math.min(Math.max(0, initial.selection.anchor), limit),
          head: Math.min(Math.max(0, initial.selection.head), limit),
        },
      })
    }
    if (initial.scrollTop !== undefined) view.scrollDOM.scrollTop = initial.scrollTop
    setCursor(cursorPosition(view))
    setIndentSize(indentationSettingsRef.current.indentSize)
    setReadOnly(initial.readOnly)
    setFileWritable(!initial.readOnly)
    setLanguageLabel(language.label)
    const semanticLanguage = language.id === 'python' || language.id === 'java' ? language.id : undefined
    const semanticEnabled = semanticLanguage === 'python'
      ? pythonIntelligenceSettingsRef.current.enabled
      : semanticLanguage === 'java' && javaIntelligenceSettingsRef.current.enabled
    if (semanticLanguage !== undefined) setIntelligenceLanguage(semanticLanguage)
    setIntelligenceStatus(semanticEnabled ? 'starting' : 'disabled')
    if (semanticLanguage !== undefined) queueMicrotask(() => { void syncIntelligenceDocument() })
    setPhase('editing')
    return true
  }, [onUpdate, syncIntelligenceDocument, tab.id])

  const applySnapshot = useCallback((snapshot: TextFileSnapshot, currentRequest: RendererRequest) => {
    const fileAddress = addressRef.current
    const observed = metaVersionRef.current ?? ''
    const view = viewRef.current
    if (view === null) {
      const draft = drafts.get(fileAddress)
      const initial = initialDocumentState(snapshot, draft)
      savedTextRef.current = initial.savedText
      baseVersionRef.current = initial.baseVersion
      newlineRef.current = initial.newline
      bomRef.current = initial.bom
      dirtyRef.current = initial.dirty
      setDirty(initial.dirty)
      setExternal(initial.conflict === 'external')
      setConflict(initial.conflict === null ? null : { kind: initial.conflict })
      setError(null)
      setStatus('idle')
      setNewlineStyle(newlineRef.current)
      const created = createEditor({
        text: initial.text,
        readOnly: !snapshot.writable,
        ...(draft !== undefined ? { selection: draft.selection, scrollTop: draft.scrollTop } : {}),
      })
      if (!created) {
        setPhase('error')
        setError({ kind: 'load', message: tRef.current('error.editorFailed') })
        currentRequest.failed()
        return
      }
      if (initial.dirty) flushDraft()
      else drafts.remove(fileAddress)
      currentRequest.loaded(observed)
      return
    }

    if (dirtyRef.current) {
      const change = assessDiskChange({
        exists: true,
        version: snapshot.version,
        baseVersion: baseVersionRef.current,
        dirty: true,
      })
      if (change === 'external') {
        setExternal(true)
        setConflict({ kind: 'external' })
      }
      currentRequest.loaded(observed)
      return
    }

    applyTextPreservingSelection(view, snapshot.content)
    savedTextRef.current = snapshot.content
    baseVersionRef.current = snapshot.version
    newlineRef.current = snapshot.newline
    bomRef.current = snapshot.bom
    setNewlineStyle(snapshot.newline)
    setFileWritable(snapshot.writable)
    setExternal(false)
    setConflict(null)
    setError(null)
    setStatus('idle')
    if (readOnlyRef.current !== !snapshot.writable) {
      setEditorReadOnly(view, readOnlyCompartmentRef.current, !snapshot.writable)
      readOnlyRef.current = !snapshot.writable
      setReadOnly(!snapshot.writable)
    }
    currentRequest.loaded(observed)
  }, [createEditor, flushDraft])

  const handleLoadError = useCallback((failure: unknown, currentRequest: RendererRequest) => {
    const message = messageOf(failure)
    currentRequest.failed()
    if (viewRef.current !== null) {
      setError({ kind: 'load', message })
      setStatus('error')
      return
    }
    setError({ kind: 'load', message })
    setPhase('error')
  }, [])

  useEffect(() => {
    if (request === undefined) return
    const controller = new AbortController()
    const signal = AbortSignal.any([controller.signal, tab.signal])
    let cancelled = false
    const parsed = parseSessionFileAddress(address) ?? null
    parsedRef.current = parsed
    if (parsed === null) {
      if (mountedRef.current) {
        setNotice({ title: tRef.current('notice.invalid.title'), detail: tRef.current('notice.invalid.detail') })
        setPhase('notice')
      }
      request.loaded(metaVersionRef.current ?? '')
      return () => controller.abort()
    }
    const run = async (): Promise<void> => {
      if (viewRef.current === null && mountedRef.current) setPhase('loading')
      try {
        const result = await readFile(parsed, signal)
        if (cancelled || signal.aborted) return
        if (result.kind === 'unsupported') {
          flushDraft()
          const hasDraft = drafts.has(addressRef.current)
          destroyEditor()
          if (!mountedRef.current) return
          setNotice(unsupportedNotice(result, hasDraft, tRef.current))
          setPhase('notice')
          setExternal(false)
          setError(null)
          request.loaded(metaVersionRef.current ?? '')
          return
        }
        applySnapshot(result, request)
      } catch (failure) {
        if (cancelled || signal.aborted) return
        handleLoadError(failure, request)
      }
    }
    void run()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [request?.revision, tab.signal, address, applySnapshot, destroyEditor, flushDraft, handleLoadError])

  // Tear the editor down when the body is showing a notice or a load error.
  useEffect(() => {
    if (phase !== 'editing') destroyEditor()
  }, [phase, destroyEditor])

  const reloadFromDisk = useCallback(async () => {
    const parsed = parsedRef.current
    if (parsed === null) return
    setError(null)
    setStatus('idle')
    try {
      const result = await readFile(parsed)
      if (result.kind !== 'text') {
        flushDraft()
        const hasDraft = drafts.has(addressRef.current)
        destroyEditor()
        if (!mountedRef.current) return
        setNotice(unsupportedNotice(result, hasDraft, tRef.current))
        setPhase('notice')
        setConflict(null)
        return
      }
      const draft = drafts.get(addressRef.current)
      drafts.remove(addressRef.current)
      savedTextRef.current = result.content
      baseVersionRef.current = result.version
      newlineRef.current = result.newline
      bomRef.current = result.bom
      setNewlineStyle(result.newline)
      dirtyRef.current = false
      setDirty(false)
      setFileWritable(result.writable)
      setExternal(false)
      setConflict(null)
      if (viewRef.current === null) {
        const created = createEditor({
          text: result.content,
          readOnly: !result.writable,
          ...(draft?.selection !== undefined ? { selection: draft.selection } : {}),
          ...(draft?.scrollTop !== undefined ? { scrollTop: draft.scrollTop } : {}),
        })
        if (!created) {
          setPhase('error')
          setError({ kind: 'load', message: tRef.current('error.editorFailed') })
          return
        }
      } else {
        applyTextPreservingSelection(viewRef.current, result.content)
        if (readOnlyRef.current !== !result.writable) {
          setEditorReadOnly(viewRef.current, readOnlyCompartmentRef.current, !result.writable)
          readOnlyRef.current = !result.writable
          setReadOnly(!result.writable)
        }
      }
      requestRef.current?.loaded(metaVersionRef.current ?? '')
    } catch (failure) {
      if (!mountedRef.current) return
      setError({ kind: 'load', message: messageOf(failure) })
      setStatus('error')
    }
  }, [createEditor, destroyEditor, flushDraft])

  const doSave = useCallback(async () => {
    const view = viewRef.current
    const parsed = parsedRef.current
    if (view === null || parsed === null) return
    if (savingRef.current) {
      saveQueuedRef.current = true
      return
    }
    if (readOnlyRef.current) {
      setError({ kind: 'readOnly', message: tRef.current('error.readOnly') })
      setStatus('error')
      return
    }
    const content = view.state.doc.toString()
    if (content === savedTextRef.current) {
      drafts.remove(addressRef.current)
      dirtyRef.current = false
      setDirty(false)
      setStatus('saved')
      if (flashTimerRef.current !== undefined) window.clearTimeout(flashTimerRef.current)
      flashTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) setStatus('idle')
      }, 1600)
      return
    }
    savingRef.current = true
    setStatus('saving')
    setError(null)
    try {
      const result = await saveFile(createSaveRequest({
        sessionId: parsed.sessionId,
        path: parsed.path,
        content,
        expectedVersion: baseVersionRef.current,
        newline: newlineRef.current,
        bom: bomRef.current,
      }))
      // The editor remains usable while the request is in flight. Reconcile
      // against its live document so keystrokes made after `content` was
      // captured remain dirty and protected by the draft store.
      const currentContent = viewRef.current?.state.doc.toString() ?? content
      const reconciled = reconcileSaveSuccess(currentContent, content, result)
      savedTextRef.current = reconciled.savedText
      baseVersionRef.current = reconciled.baseVersion
      const stillDirty = reconciled.dirty
      dirtyRef.current = stillDirty
      setDirty(stillDirty)
      if (stillDirty) flushDraft()
      else drafts.remove(addressRef.current)
      setConflict(null)
      conflictRef.current = null
      setExternal(false)
      setStatus(stillDirty ? 'idle' : 'saved')
      if (!stillDirty) {
        if (flashTimerRef.current !== undefined) window.clearTimeout(flashTimerRef.current)
        flashTimerRef.current = window.setTimeout(() => {
          if (mountedRef.current) setStatus('idle')
        }, 2200)
      }
    } catch (failure) {
      if (!mountedRef.current) return
      const apiFailure = failure instanceof ApiCallError ? failure : undefined
      if (apiFailure?.code === 'conflict') {
        setExternal(true)
        const nextConflict: Conflict = { kind: 'save' }
        conflictRef.current = nextConflict
        setConflict(nextConflict)
      } else {
        setError({ kind: 'save', message: apiFailure?.message ?? messageOf(failure) })
      }
      setStatus('error')
    } finally {
      savingRef.current = false
      if (saveQueuedRef.current) {
        saveQueuedRef.current = false
        queueMicrotask(() => {
          if (
            mountedRef.current
            && dirtyRef.current
            && conflictRef.current === null
          ) void doSaveRef.current()
        })
      }
    }
  }, [flushDraft])
  doSaveRef.current = doSave

  useEffect(() => {
    if (!autoSaveSettings.enabled) return
    const timer = window.setInterval(() => {
      if (!canAutoSave({
        editing: phase === 'editing',
        dirty: dirtyRef.current,
        readOnly: readOnlyRef.current,
        saving: savingRef.current,
        conflicted: conflictRef.current !== null,
      })) return
      void doSaveRef.current()
    }, autoSaveDelay(autoSaveSettings))
    return () => window.clearInterval(timer)
  }, [autoSaveSettings.enabled, autoSaveSettings.intervalSeconds, phase])

  const keepDraft = useCallback(() => {
    setConflict(null)
  }, [])

  const retryLoad = useCallback(() => {
    requestRef.current?.reload()
  }, [])

  const copyDraft = useCallback(async () => {
    const draft = drafts.get(addressRef.current)
    if (draft === undefined) return
    try {
      await navigator.clipboard.writeText(draft.content)
      setCopied(true)
      if (copyTimerRef.current !== undefined) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) setCopied(false)
      }, 1600)
    } catch {
      setError({ kind: 'copy', message: tRef.current('error.copyFailed') })
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!tab.visible) return
      // Never steal the shortcut from chat, search, or another panel: only a
      // focused element inside this editor counts as "editing this file".
      const root = rootRef.current
      const target = event.target
      if (root === null || !(target instanceof Node) || !root.contains(target)) return
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      if (event.key.toLowerCase() !== 's' && event.code !== 'KeyS') return
      event.preventDefault()
      event.stopPropagation()
      void doSave()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [tab.visible, doSave])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      flushDraft()
      if (!dirtyRef.current && !drafts.has(addressRef.current)) return
      event.preventDefault()
      event.returnValue = ''
    }
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') flushDraft()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [flushDraft])

  useEffect(() => {
    const onFocus = (): void => {
      const parsed = parsedRef.current
      if (parsed === null || viewRef.current === null) return
      void (async () => {
        try {
          const result = await statFile(parsed)
          const decision = assessDiskChange({
            exists: result.exists,
            version: result.version,
            baseVersion: baseVersionRef.current,
            dirty: dirtyRef.current,
          })
          if (decision === 'deleted') {
            setExternal(true)
            setConflict({ kind: 'deleted' })
          } else if (decision === 'external') {
            setExternal(true)
            setConflict({ kind: 'external' })
          } else if (decision === 'reload') requestRef.current?.reload()
        } catch {
          // Opportunistic check; save still performs the authoritative one.
        }
      })()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  useEffect(() => {
    if (phase !== 'editing') return
    const view = viewRef.current
    const line = tab.navigation.params?.line
    if (view === null || typeof line !== 'number' || !Number.isFinite(line) || line < 1) return
    revealLine(view, line)
  }, [phase, tab.navigation.revision, tab.navigation.params?.line])

  useEffect(() => () => {
    if (cursorFrameRef.current !== 0) window.cancelAnimationFrame(cursorFrameRef.current)
    if (draftTimerRef.current !== undefined) window.clearTimeout(draftTimerRef.current)
    if (flashTimerRef.current !== undefined) window.clearTimeout(flashTimerRef.current)
    if (copyTimerRef.current !== undefined) window.clearTimeout(copyTimerRef.current)
    if (intelligenceTimerRef.current !== undefined) window.clearTimeout(intelligenceTimerRef.current)
    destroyEditor()
  }, [destroyEditor])

  if (props.content.kind !== 'renderer') return null

  const pending = phase === 'loading'
  const noticeHasDraft = phase === 'notice' ? drafts.has(address) : false
  const statusKey = !fileWritable && phase === 'editing'
    ? 'status.readOnly'
    : status === 'saving'
      ? 'status.saving'
      : status === 'saved'
        ? 'status.saved'
        : status === 'error'
          ? 'status.saveError'
          : dirty
            ? 'status.dirty'
            : 'status.synced'

  let banner: { tone: 'warn' | 'error', title: string, detail: string, actions: BannerAction[] } | null = null
  if (conflict !== null) {
    if (conflict.kind === 'restored') {
      banner = {
        tone: 'warn',
        title: t('banner.restored.title'),
        detail: t('banner.restored.detail'),
        actions: [
          { label: t('action.discard'), variant: 'primary', onClick: () => { void reloadFromDisk() } },
          { label: t('action.continue'), variant: 'quiet', onClick: keepDraft },
        ],
      }
    } else if (conflict.kind === 'external') {
      banner = {
        tone: 'warn',
        title: t('banner.external.title'),
        detail: t('banner.external.detail'),
        actions: [
          { label: t('action.reload'), variant: 'primary', onClick: () => { void reloadFromDisk() } },
          { label: t('action.keep'), variant: 'quiet', onClick: keepDraft },
        ],
      }
    } else if (conflict.kind === 'save') {
      banner = {
        tone: 'warn',
        title: t('banner.save.title'),
        detail: t('banner.save.detail'),
        actions: [
          { label: t('action.reload'), variant: 'primary', onClick: () => { void reloadFromDisk() } },
          { label: t('action.keep'), variant: 'quiet', onClick: keepDraft },
        ],
      }
    } else {
      banner = {
        tone: 'warn',
        title: t('banner.deleted.title'),
        detail: t('banner.deleted.detail'),
        actions: [
          { label: t('action.retry'), variant: 'primary', onClick: retryLoad },
          { label: t('action.keep'), variant: 'quiet', onClick: keepDraft },
        ],
      }
    }
  } else if (error !== null && phase === 'editing') {
    const loadError = error.kind === 'load'
    banner = {
      tone: 'error',
      title: loadError ? t('banner.loadError.title') : t('banner.saveError.title'),
      detail: error.message,
      actions: [
        {
          label: loadError ? t('action.retry') : t('action.retrySave'),
          variant: 'primary',
          onClick: loadError ? retryLoad : () => { void doSave() },
        },
        { label: t('action.dismiss'), variant: 'quiet', onClick: () => setError(null) },
      ],
    }
  }

  return (
    <div ref={rootRef} className={ROOT_CLASS} data-dsh-codecraft-root="" data-dirty={dirty ? '' : undefined}>
      {banner !== null && (
        <div className={`${ROOT_CLASS}-banner`} data-tone={banner.tone} role="status">
          <div className={`${ROOT_CLASS}-banner-text`}>
            <div className={`${ROOT_CLASS}-banner-title`}>{banner.title}</div>
            <div className={`${ROOT_CLASS}-banner-detail`}>{banner.detail}</div>
          </div>
          <div className={`${ROOT_CLASS}-banner-actions`}>
            {banner.actions.map(action => (
              <button
                key={action.label}
                type="button"
                className={`${ROOT_CLASS}-button`}
                data-variant={action.variant}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className={`${ROOT_CLASS}-editor`} data-phase={phase}>
        <div ref={hostRef} style={{ display: phase === 'editing' ? undefined : 'none' }} />
        {phase !== 'editing' && (
          <div className={`${ROOT_CLASS}-center`}>
            {phase === 'loading' && (
              <>
                <div className={`${ROOT_CLASS}-spinner`} aria-hidden="true" />
                <div>{t('loading')}</div>
              </>
            )}
            {phase === 'notice' && notice !== null && (
              <>
                <div className={`${ROOT_CLASS}-center-title`}>{notice.title}</div>
                <div>{notice.detail}</div>
                <div className={`${ROOT_CLASS}-center-hint`}>{t('notice.hint')}</div>
                <div className={`${ROOT_CLASS}-banner-actions`}>
                  <button type="button" className={`${ROOT_CLASS}-button`} onClick={retryLoad}>
                    {t('action.retry')}
                  </button>
                  {noticeHasDraft && (
                    <button type="button" className={`${ROOT_CLASS}-button`} data-variant="quiet" onClick={() => { void copyDraft() }}>
                      {copied ? t('action.copied') : t('action.copyDraft')}
                    </button>
                  )}
                </div>
              </>
            )}
            {phase === 'error' && (
              <>
                <div className={`${ROOT_CLASS}-center-title`}>{t('error.load.title')}</div>
                <div>{error?.message ?? t('error.load.unknown')}</div>
                <div className={`${ROOT_CLASS}-banner-actions`}>
                  <button type="button" className={`${ROOT_CLASS}-button`} data-variant="primary" onClick={retryLoad}>
                    {t('action.retry')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <footer className={`${ROOT_CLASS}-status`} aria-live="polite">
        {phase === 'editing' && <span className={`${ROOT_CLASS}-status-item`}>{languageLabel}</span>}
        {phase === 'editing' && (
          <span className={`${ROOT_CLASS}-status-item`}>
            {t('status.cursor', { line: cursor.line, column: cursor.column })}
          </span>
        )}
        {phase === 'editing' && (
          <span className={`${ROOT_CLASS}-status-item`}>
            {t('status.spaces', { size: indentSize })}
          </span>
        )}
        {phase === 'editing' && (
          <span className={`${ROOT_CLASS}-status-item`}>{newlineStyle === 'crlf' ? 'CRLF' : 'LF'}</span>
        )}
        {phase === 'editing' && intelligenceStatus !== 'disabled' && (
          <span
            className={`${ROOT_CLASS}-status-item`}
            data-state={intelligenceStatus === 'error' || intelligenceStatus === 'unavailable' ? 'error' : undefined}
            title={intelligenceMessage}
          >
            {t(`status.intelligence.${intelligenceLanguage}.${intelligenceStatus}`)}
          </span>
        )}
        {pending && <span className={`${ROOT_CLASS}-status-item`}>{t('status.loading')}</span>}
        <span className={`${ROOT_CLASS}-status-spacer`} />
        {external && <span className={`${ROOT_CLASS}-status-item`} data-state="dirty">{t('status.external')}</span>}
        {phase === 'editing' && dirty && fileWritable && (
          <button
            type="button"
            className={`${ROOT_CLASS}-button`}
            data-variant="quiet"
            disabled={status === 'saving'}
            onClick={() => { void doSave() }}
          >
            {t('action.save')}
          </button>
        )}
        {phase === 'editing' && (
          <span className={`${ROOT_CLASS}-status-item`} data-state={statusKey === 'status.dirty' ? 'dirty' : status === 'error' ? 'error' : status === 'saved' ? 'saved' : undefined}>
            {dirty && <span className={`${ROOT_CLASS}-dot`} aria-hidden="true" />}
            {t(statusKey)}
          </span>
        )}
      </footer>
    </div>
  )
}
