/**
 * The body DSH renders inside a native file tab for source and text files.
 *
 * It owns three things and nothing else: loading the complete file through the
 * Host save adapter, the CodeMirror editor, and disk-conflict state. The tab,
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
  definitionIntelligence,
  readFile,
  referencesIntelligence,
  saveFile,
  statFile,
  syncIntelligence,
} from '../api.js'
import { fileNameOf, parseSessionFileAddress, sessionFileAddress } from '../address.js'
import {
  applyTextPreservingSelection,
  buildEditorExtensions,
  cursorPosition,
  revealLine,
  revealRange,
  setHtmlEditingAssistance,
  setEditorIndentation,
  setJavaEditingAssistance,
  setEditorReadOnly,
  type HtmlEditingStatus,
} from '../editor/index.js'
import { semanticCompletionSource } from '../editor/extensions/semantic-completion.js'
import { languageForFile } from '../languages/index.js'
import {
  pythonNavigationExtensions,
  type PythonNavigationClick,
} from '../languages/python/features/navigation.js'
import { navigationCoordinator, type NavigationPoint } from '../navigation/coordinator.js'
import { ROOT_CLASS } from '../theme.js'
import { HtmlOutlinePanel } from './HtmlOutlinePanel.js'
import { HtmlProblemsPanel } from './HtmlProblemsPanel.js'
import { HtmlRenamePanel } from './HtmlRenamePanel.js'
import { htmlBreadcrumbs, type HtmlBreadcrumb } from '../languages/html/features/structure.js'
import { htmlOutline, type HtmlOutlineNode } from '../languages/html/features/outline.js'
import { analyzeHtml, type HtmlDiagnostic } from '../languages/html/features/diagnostics.js'
import {
  htmlIdAt,
  htmlTagAt,
  canApplyHtmlRefactor,
  planHtmlIdRename,
  planHtmlTagRename,
  type HtmlRefactorError,
  type HtmlRefactorPlan,
} from '../languages/html/features/refactoring.js'
import { formatHtmlDocument, formatHtmlSelection } from '../languages/html/features/formatting.js'
import { insertHtmlTemplate } from '../languages/html/features/emmet.js'
import { bindHtmlFeatureHost, unbindHtmlFeatureHost } from '../languages/html/features/host.js'
import {
  isHtmlFilePath,
  notifyHtmlPreviewController,
  openPreviewPath,
  setHtmlPreviewController,
} from '../languages/html/preview.js'
import type { DocumentBodyProps, RendererRequest } from '../dsh.js'
import { assessDiskChange } from '../document/conflicts.js'
import { createSaveRequest, reconcileSaveSuccess } from '../document/save.js'
import { LatestSaveQueue } from '../document/save-queue.js'
import { registerOpenDocument } from '../document/registry.js'
import { editorStatusKey } from '../document/status.js'
import { differsFromSavedText, initialDocumentState } from '../document/state.js'
import { editorSettings } from '../settings/editor-settings.js'
import type {
  IntelligenceStatusKind,
  IntelligenceLocation,
  TextFileSnapshot,
  UnsupportedFileSnapshot,
} from '../../protocol.js'

type Phase = 'loading' | 'editing' | 'notice' | 'error'
type Status = 'idle' | 'saving' | 'saved' | 'error'
type ConflictKind = 'external' | 'save' | 'deleted'
type ErrorKind = 'save' | 'load' | 'readOnly'

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

interface FeatureNotice {
  tone: 'error' | 'success' | 'info'
  text: string
}

interface NavigationPanel {
  kind: 'loading' | 'locations' | 'message'
  titleKey: string
  source?: NavigationPoint
  locations?: IntelligenceLocation[]
  message?: string
}

interface HtmlRenameSession {
  kind: 'tag' | 'id'
  position: number
  newName: string
  plan?: HtmlRefactorPlan
  error?: string
}

function containsPosition(location: IntelligenceLocation, path: string, position: { line: number, character: number }): boolean {
  if (location.path.replaceAll('\\', '/') !== path.replaceAll('\\', '/')) return false
  const { start, end } = location.range
  if (position.line < start.line || position.line > end.line) return false
  if (position.line === start.line && position.character < start.character) return false
  if (position.line === end.line && position.character > end.character) return false
  return true
}

function groupedLocations(locations: readonly IntelligenceLocation[]): Array<{
  path: string
  locations: IntelligenceLocation[]
}> {
  const groups = new Map<string, IntelligenceLocation[]>()
  for (const location of locations) {
    const group = groups.get(location.path)
    if (group === undefined) groups.set(location.path, [location])
    else group.push(location)
  }
  return [...groups].map(([path, entries]) => ({ path, locations: entries }))
}

function excerptParts(location: IntelligenceLocation): { before: string, match: string, after: string } | undefined {
  const excerpt = location.excerpt
  if (excerpt === undefined) return undefined
  const start = Math.min(Math.max(0, location.range.start.character), excerpt.length)
  const end = location.range.end.line === location.range.start.line
    ? Math.min(Math.max(start, location.range.end.character), excerpt.length)
    : excerpt.length
  return {
    before: excerpt.slice(0, start),
    match: excerpt.slice(start, end),
    after: excerpt.slice(end),
  }
}

const HTML_REPORT_KEYS: Record<string, string> = {
  'missing-file': 'html.navigation.missingFile',
  'outside-workspace': 'html.navigation.outsideWorkspace',
  'root-relative': 'html.navigation.rootRelative',
  'unsupported-url': 'html.navigation.unsupportedUrl',
  'unresolved-path': 'html.navigation.unresolvedPath',
  'missing-id': 'html.navigation.missingId',
  'duplicate-id': 'html.navigation.duplicateId',
  'emmet-invalid': 'html.emmet.invalid',
  'empty-document': 'html.format.empty',
  'unsupported-selection': 'html.format.unsupportedSelection',
  'formatter-failed': 'html.format.failed',
  'outside-selection': 'html.format.outsideSelection',
}

const HTML_REFACTOR_KEYS: Record<HtmlRefactorError, string> = {
  'not-tag': 'html.rename.error.notTag',
  'not-id': 'html.rename.error.notId',
  'invalid-name': 'html.rename.error.invalidName',
  'unsafe-tag': 'html.rename.error.unsafeTag',
  'duplicate-id': 'html.rename.error.duplicateId',
  'id-conflict': 'html.rename.error.idConflict',
  unchanged: 'html.rename.error.unchanged',
}

function messageOf(error: unknown): string {
  if (error instanceof ApiCallError) return error.message
  if (error instanceof Error) return error.message
  return String(error)
}

function unsupportedNotice(
  result: UnsupportedFileSnapshot,
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
  return {
    title: t(reasonTitle[result.reason]),
    detail: t(reasonDetail[result.reason]),
    reason: result.reason,
  }
}

export function CodeCraftBody(props: DocumentBodyProps): ReactElement | null {
  const settingsSnapshot = useSyncExternalStore(
    editorSettings.subscribe,
    editorSettings.getSnapshot,
    editorSettings.getSnapshot,
  )
  const settings = settingsSnapshot.settings
  const indentationSettings = settings.indentation
  const pythonIntelligenceSettings = settingsSnapshot.pythonIntelligence
  const javaEditingAssistance = settingsSnapshot.javaEditingAssistance
  const htmlEditingAssistance = settingsSnapshot.htmlEditingAssistance
  const { tab } = props.useTabInfo()
  const request = props.content.kind === 'renderer' ? props.content : undefined
  const useResource = props.useResource ?? (() => ({ status: 'none' as const }))
  const meta = useResource(tab.contentId)
  const t = props.t ?? ((key: string) => key)
  const tRef = useRef(t)
  tRef.current = t

  const address = props.resourceAddress
  useSyncExternalStore(
    navigationCoordinator.subscribe,
    navigationCoordinator.version,
    navigationCoordinator.version,
  )
  const navigationAddress = parseSessionFileAddress(address)
  const navigationHistory = navigationAddress === undefined
    ? { canBack: false, canForward: false }
    : navigationCoordinator.snapshot(navigationAddress.sessionId)
  const addressRef = useRef(address)
  addressRef.current = address
  const propsRef = useRef(props)
  propsRef.current = props
  const requestRef = useRef<RendererRequest | undefined>(request)
  requestRef.current = request
  const metaVersionRef = useRef<string | undefined>(undefined)
  metaVersionRef.current = meta.status === 'live' ? meta.value?.version : undefined
  const absolutePath = meta.value?.absolutePath

  const rootRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const readOnlyCompartmentRef = useRef(new Compartment())
  const indentationCompartmentRef = useRef(new Compartment())
  const languageCompartmentRef = useRef(new Compartment())
  const indentationSettingsRef = useRef(indentationSettings)
  indentationSettingsRef.current = indentationSettings
  const pythonIntelligenceSettingsRef = useRef(pythonIntelligenceSettings)
  pythonIntelligenceSettingsRef.current = pythonIntelligenceSettings
  const javaEditingAssistanceRef = useRef(javaEditingAssistance)
  javaEditingAssistanceRef.current = javaEditingAssistance
  const htmlEditingAssistanceRef = useRef(htmlEditingAssistance)
  htmlEditingAssistanceRef.current = htmlEditingAssistance
  const phaseRef = useRef<Phase>('loading')
  const absolutePathRef = useRef<string | undefined>(undefined)
  const previewBusyRef = useRef(false)
  const requestPreviewRef = useRef<() => void>(() => {})
  const outlineOpenRef = useRef(false)
  const htmlActiveRef = useRef(false)
  const noticeTimerRef = useRef<number | undefined>(undefined)
  const savedTextRef = useRef('')
  const baseVersionRef = useRef('')
  const newlineRef = useRef<'lf' | 'crlf'>('lf')
  const bomRef = useRef(false)
  const dirtyRef = useRef(false)
  const readOnlyRef = useRef(false)
  const savingRef = useRef(false)
  const saveQueueRef = useRef(new LatestSaveQueue())
  const doSaveRef = useRef<() => Promise<boolean>>(async () => false)
  const conflictRef = useRef<Conflict | null>(null)
  const parsedRef = useRef<{ sessionId: string, path: string } | null>(null)
  const mountedRef = useRef(true)
  const initialisedRef = useRef(false)
  const cursorFrameRef = useRef(0)
  const suppressSaveRef = useRef(false)
  const flashTimerRef = useRef<number | undefined>(undefined)
  const intelligenceTimerRef = useRef<number | undefined>(undefined)
  const htmlDiagnosticTimerRef = useRef<number | undefined>(undefined)
  const intelligenceRevisionRef = useRef(1)
  const intelligenceGenerationRef = useRef(0)
  const intelligenceDocumentIdRef = useRef<string | undefined>(undefined)
  const syncIntelligenceDocumentRef = useRef<() => Promise<void>>(async () => {})
  const handlePythonNavigateRef = useRef<(click: PythonNavigationClick) => void>(() => {})
  const navigationAbortRef = useRef<AbortController | undefined>(undefined)

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
  const [intelligenceStatus, setIntelligenceStatus] = useState<IntelligenceStatusKind>('disabled')
  const [intelligenceMessage, setIntelligenceMessage] = useState<string | undefined>(undefined)
  const [htmlStatus, setHtmlStatus] = useState<HtmlEditingStatus | undefined>(undefined)
  const [navigationPanel, setNavigationPanel] = useState<NavigationPanel | null>(null)
  const [languageId, setLanguageId] = useState('plain')
  const [htmlCrumbs, setHtmlCrumbs] = useState<HtmlBreadcrumb[]>([])
  const [htmlOutlineNodes, setHtmlOutlineNodes] = useState<HtmlOutlineNode[]>([])
  const [htmlDiagnostics, setHtmlDiagnostics] = useState<HtmlDiagnostic[]>([])
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [problemsOpen, setProblemsOpen] = useState(false)
  const [htmlRename, setHtmlRename] = useState<HtmlRenameSession | null>(null)
  const [featureNotice, setFeatureNotice] = useState<FeatureNotice | null>(null)
  const [previewPrompt, setPreviewPrompt] = useState(false)

  phaseRef.current = phase
  absolutePathRef.current = meta.value?.absolutePath
  outlineOpenRef.current = outlineOpen
  htmlActiveRef.current = languageId === 'html'
    && htmlEditingAssistance.enabled
    && htmlStatus !== 'error'
    && phase === 'editing'

  const showFeatureNotice = useCallback((text: string, tone: FeatureNotice['tone'] = 'error'): void => {
    if (!mountedRef.current) return
    setFeatureNotice({ tone, text })
    if (noticeTimerRef.current !== undefined) window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => {
      noticeTimerRef.current = undefined
      if (mountedRef.current) setFeatureNotice(null)
    }, 5000)
  }, [])

  const reportHtmlCode = useCallback((code: string): void => {
    showFeatureNotice(tRef.current(HTML_REPORT_KEYS[code] ?? 'html.genericError'))
  }, [showFeatureNotice])

  const revealHtmlOffset = useCallback((from: number, to: number): void => {
    const view = viewRef.current
    if (view === null) return
    const limit = view.state.doc.length
    const anchor = Math.min(Math.max(0, from), limit)
    const head = Math.min(Math.max(anchor, to), limit)
    view.dispatch({
      selection: { anchor, head },
      effects: EditorView.scrollIntoView(anchor, { y: 'center' }),
    })
    view.focus()
  }, [])

  const openPreviewNow = useCallback(async (): Promise<void> => {
    const path = absolutePathRef.current
    if (path === undefined) {
      showFeatureNotice(tRef.current('preview.error.named'))
      return
    }
    if (previewBusyRef.current) return
    previewBusyRef.current = true
    notifyHtmlPreviewController()
    try {
      const opened = await openPreviewPath(path)
      if (!mountedRef.current) return
      if (opened) showFeatureNotice(tRef.current('preview.opened'), 'success')
      else showFeatureNotice(tRef.current('preview.error.open'))
    } catch {
      if (mountedRef.current) showFeatureNotice(tRef.current('preview.error.open'))
    } finally {
      previewBusyRef.current = false
      notifyHtmlPreviewController()
    }
  }, [showFeatureNotice])

  const saveForPreview = useCallback(async (): Promise<boolean> => {
    for (let attempt = 0; attempt < 400 && savingRef.current; attempt += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 25))
    }
    if (dirtyRef.current) await doSaveRef.current()
    return !dirtyRef.current && conflictRef.current === null && !readOnlyRef.current
  }, [])

  const requestPreview = useCallback((): void => {
    if (phaseRef.current !== 'editing') {
      showFeatureNotice(tRef.current('preview.error.named'))
      return
    }
    if (readOnlyRef.current) {
      showFeatureNotice(tRef.current('preview.error.readOnly'))
      return
    }
    if (absolutePathRef.current === undefined) {
      showFeatureNotice(tRef.current('preview.error.named'))
      return
    }
    if (dirtyRef.current) {
      setPreviewPrompt(true)
      return
    }
    void openPreviewNow()
  }, [openPreviewNow, showFeatureNotice])
  requestPreviewRef.current = requestPreview

  const saveAndPreview = useCallback(async (): Promise<void> => {
    setPreviewPrompt(false)
    const saved = await saveForPreview()
    if (!saved) {
      if (mountedRef.current) showFeatureNotice(tRef.current('preview.error.save'))
      return
    }
    await openPreviewNow()
  }, [openPreviewNow, saveForPreview, showFeatureNotice])

  useEffect(() => {
    const active = languageId === 'html'
      && htmlEditingAssistance.enabled
      && htmlStatus !== 'error'
      && phase === 'editing'
    if (!active || absolutePath === undefined || !isHtmlFilePath(absolutePath)) return
    return setHtmlPreviewController({
      path: absolutePath,
      state: () => ({ dirty: dirtyRef.current, busy: previewBusyRef.current }),
      requestPreview: () => requestPreviewRef.current(),
    })
  }, [absolutePath, languageId, htmlEditingAssistance.enabled, htmlStatus, phase])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (tab.visible) return
    navigationAbortRef.current?.abort()
    navigationAbortRef.current = undefined
    setNavigationPanel(null)
  }, [tab.visible])

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
    const view = viewRef.current
    const parsed = parsedRef.current
    if (view === null || parsed === null) return
    const language = languageForFile(fileNameOf(parsed.path))
    setJavaEditingAssistance(
      view,
      languageCompartmentRef.current,
      language,
      javaEditingAssistance.enabled,
    )
  }, [javaEditingAssistance.enabled])

  useEffect(() => {
    const view = viewRef.current
    const parsed = parsedRef.current
    if (view === null || parsed === null) return
    const language = languageForFile(fileNameOf(parsed.path))
    const nextStatus = setHtmlEditingAssistance(
      view,
      languageCompartmentRef.current,
      language,
      htmlEditingAssistance.enabled,
    )
    setHtmlStatus(nextStatus)
    if (nextStatus === 'ready') {
      setHtmlCrumbs(htmlBreadcrumbs(view.state))
    } else {
      setHtmlCrumbs([])
      setHtmlOutlineNodes([])
      setHtmlDiagnostics([])
      setOutlineOpen(false)
      setProblemsOpen(false)
      setHtmlRename(null)
    }
  }, [htmlEditingAssistance.enabled])

  useEffect(() => {
    if (!outlineOpen) return
    const view = viewRef.current
    if (view !== null && htmlActiveRef.current) setHtmlOutlineNodes(htmlOutline(view.state))
  }, [outlineOpen, languageId, htmlEditingAssistance.enabled, htmlStatus])

  useEffect(() => {
    if (viewRef.current !== null) void syncIntelligenceDocumentRef.current()
  }, [
    pythonIntelligenceSettings.enabled,
    pythonIntelligenceSettings.completion,
    pythonIntelligenceSettings.interpreterPath,
    pythonIntelligenceSettings.serverPath,
  ])

  useEffect(() => {
    conflictRef.current = conflict
  }, [conflict])

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
    viewRef.current = null
    unbindHtmlFeatureHost(view)
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
  }, [])

  const syncDirty = useCallback((view: EditorView) => {
    const next = differsFromSavedText(view.state.doc.toString(), savedTextRef.current)
    if (next !== dirtyRef.current) {
      dirtyRef.current = next
      if (mountedRef.current) setDirty(next)
      notifyHtmlPreviewController()
    }
    return next
  }, [])

  const syncIntelligenceDocument = useCallback(async (): Promise<void> => {
    const parsed = parsedRef.current
    const view = viewRef.current
    const documentId = intelligenceDocumentIdRef.current
    const python = parsed !== null && /\.(?:py|pyi|pyw)$/i.test(parsed.path)
    const enabled = python
      && pythonIntelligenceSettingsRef.current.enabled
    if (!enabled || parsed === null || view === null || documentId === undefined) {
      if (mountedRef.current) setIntelligenceStatus('disabled')
      return
    }
    if (mountedRef.current) {
      setIntelligenceStatus('starting')
      setIntelligenceMessage(undefined)
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

  const scheduleHtmlDiagnostics = useCallback((view: EditorView): void => {
    if (htmlDiagnosticTimerRef.current !== undefined) {
      window.clearTimeout(htmlDiagnosticTimerRef.current)
    }
    const document = view.state.doc
    htmlDiagnosticTimerRef.current = window.setTimeout(() => {
      htmlDiagnosticTimerRef.current = undefined
      const current = viewRef.current
      if (current !== view || current.state.doc !== document || !htmlActiveRef.current) return
      setHtmlDiagnostics(analyzeHtml(current.state))
    }, 300)
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!htmlActiveRef.current || view === null) {
      if (htmlDiagnosticTimerRef.current !== undefined) {
        window.clearTimeout(htmlDiagnosticTimerRef.current)
        htmlDiagnosticTimerRef.current = undefined
      }
      setHtmlDiagnostics([])
      setProblemsOpen(false)
      setHtmlRename(null)
      return
    }
    setHtmlDiagnostics(analyzeHtml(view.state))
  }, [languageId, htmlEditingAssistance.enabled, htmlStatus, phase])

  const onUpdate = useCallback((update: ViewUpdate) => {
    if (update.docChanged) {
      navigationAbortRef.current?.abort()
      navigationAbortRef.current = undefined
      setNavigationPanel(null)
      syncDirty(update.view)
      if (!suppressSaveRef.current) void doSaveRef.current()
      intelligenceRevisionRef.current += 1
      if (htmlActiveRef.current) scheduleHtmlDiagnostics(update.view)
      if (intelligenceTimerRef.current !== undefined) window.clearTimeout(intelligenceTimerRef.current)
      intelligenceTimerRef.current = window.setTimeout(() => {
        intelligenceTimerRef.current = undefined
        void syncIntelligenceDocument()
      }, 150)
    }
    if (update.docChanged || update.selectionSet) {
      if (htmlActiveRef.current) {
        setHtmlCrumbs(htmlBreadcrumbs(update.view.state))
        if (update.docChanged && outlineOpenRef.current) {
          setHtmlOutlineNodes(htmlOutline(update.view.state))
        }
      }
      if (cursorFrameRef.current !== 0) return
      cursorFrameRef.current = window.requestAnimationFrame(() => {
        cursorFrameRef.current = 0
        const view = viewRef.current
        if (view !== null && mountedRef.current) setCursor(cursorPosition(view))
      })
    }
  }, [scheduleHtmlDiagnostics, syncDirty, syncIntelligenceDocument])

  const startHtmlRename = useCallback((kind: 'tag' | 'id'): void => {
    const view = viewRef.current
    if (view === null || !htmlActiveRef.current) return
    const position = view.state.selection.main.head
    const current = kind === 'tag'
      ? htmlTagAt(view.state, position)
      : htmlIdAt(view.state, position)
    if (current === undefined) {
      showFeatureNotice(tRef.current(kind === 'tag' ? 'html.rename.error.notTag' : 'html.rename.error.notId'))
      return
    }
    setHtmlRename({ kind, position, newName: current })
  }, [showFeatureNotice])

  const previewHtmlRename = useCallback((): void => {
    const view = viewRef.current
    if (view === null || htmlRename === null) return
    const result = htmlRename.kind === 'tag'
      ? planHtmlTagRename(view.state, htmlRename.position, htmlRename.newName)
      : planHtmlIdRename(view.state, htmlRename.position, htmlRename.newName)
    if ('error' in result) {
      setHtmlRename({
        kind: htmlRename.kind,
        position: htmlRename.position,
        newName: htmlRename.newName,
        error: tRef.current(HTML_REFACTOR_KEYS[result.error]),
      })
      return
    }
    setHtmlRename({
      kind: htmlRename.kind,
      position: htmlRename.position,
      newName: htmlRename.newName,
      plan: result.plan,
    })
  }, [htmlRename])

  const confirmHtmlRename = useCallback(async (): Promise<void> => {
    const session = htmlRename
    const plan = session?.plan
    const view = viewRef.current
    const parsed = parsedRef.current
    if (session === null || session === undefined || plan === undefined || view === null || parsed === null) return
    const fail = (key: string): void => {
      setHtmlRename({
        kind: session.kind,
        position: session.position,
        newName: session.newName,
        plan,
        error: tRef.current(key),
      })
    }
    if (!canApplyHtmlRefactor(plan, view.state, {
      active: htmlActiveRef.current,
      readOnly: view.state.readOnly || readOnlyRef.current,
      conflicted: conflictRef.current !== null,
      saving: savingRef.current,
    })) {
      fail('html.rename.error.stale')
      return
    }
    try {
      const disk = await statFile(parsed)
      if (viewRef.current !== view || view.state.doc !== plan.document || !htmlActiveRef.current) {
        fail('html.rename.error.stale')
        return
      }
      if (!disk.exists) {
        setExternal(true)
        setConflict({ kind: 'deleted' })
        fail('html.rename.error.external')
        return
      }
      if (disk.version !== baseVersionRef.current) {
        setExternal(true)
        setConflict({ kind: 'external' })
        fail('html.rename.error.external')
        return
      }
    } catch {
      fail('html.rename.error.verify')
      return
    }
    view.dispatch({
      changes: plan.changes.map(change => ({ from: change.from, to: change.to, insert: change.insert })),
      userEvent: 'input.rename',
    })
    view.focus()
    setHtmlRename(null)
  }, [htmlRename])

  const navigateToLocation = useCallback(async (
    source: NavigationPoint,
    location: IntelligenceLocation,
  ): Promise<void> => {
    setNavigationPanel(null)
    const opened = await navigationCoordinator.navigate(source, {
      sessionId: source.sessionId,
      path: location.path,
      range: location.range,
      ...(location.excerpt === undefined ? {} : { excerpt: location.excerpt }),
    })
    if (!opened && mountedRef.current) {
      setNavigationPanel({
        kind: 'message',
        titleKey: 'navigation.title',
        message: tRef.current('navigation.openFailed'),
      })
    }
  }, [])

  const handlePythonNavigate = useCallback((click: PythonNavigationClick): void => {
    const parsed = parsedRef.current
    const view = viewRef.current
    const documentId = intelligenceDocumentIdRef.current
    if (parsed === null || view === null || documentId === undefined
      || !pythonIntelligenceSettingsRef.current.enabled) return
    navigationAbortRef.current?.abort()
    const controller = new AbortController()
    navigationAbortRef.current = controller
    const revision = intelligenceRevisionRef.current
    const input = {
      sessionId: parsed.sessionId,
      path: parsed.path,
      tabId: documentId,
      revision,
      content: view.state.doc.toString(),
      position: click.position,
    }
    const fresh = (): boolean => !controller.signal.aborted
      && intelligenceDocumentIdRef.current === documentId
      && intelligenceRevisionRef.current === revision
    setNavigationPanel({ kind: 'loading', titleKey: 'navigation.loading' })
    void (async () => {
      try {
        const definitions = await definitionIntelligence(input, controller.signal)
        if (!fresh() || definitions.revision !== revision) return
        setIntelligenceStatus('ready')
        setIntelligenceMessage(undefined)
        const source: NavigationPoint = {
          sessionId: parsed.sessionId,
          path: definitions.sourcePath,
          range: click.range,
          excerpt: input.content.split('\n')[click.position.line],
        }
        const declaration = definitions.locations.find(location => (
          containsPosition(location, definitions.sourcePath, click.position)
        ))
        if (declaration !== undefined) {
          const references = await referencesIntelligence(input, controller.signal)
          if (!fresh() || references.revision !== revision) return
          const locations = references.locations.filter(location => !(
            location.path === references.sourcePath
            && location.range.start.line === declaration.range.start.line
            && location.range.start.character === declaration.range.start.character
          ))
          setNavigationPanel(locations.length === 0
            ? {
                kind: 'message',
                titleKey: 'navigation.references',
                message: tRef.current('navigation.noReferences'),
              }
            : {
                kind: 'locations',
                titleKey: 'navigation.references',
                source,
                locations,
              })
          return
        }
        if (definitions.locations.length === 0) {
          setNavigationPanel({
            kind: 'message',
            titleKey: 'navigation.definitions',
            message: tRef.current('navigation.noDefinition'),
          })
          return
        }
        if (definitions.locations.length === 1) {
          const target = definitions.locations[0]
          if (target !== undefined) await navigateToLocation(source, target)
          return
        }
        setNavigationPanel({
          kind: 'locations',
          titleKey: 'navigation.definitions',
          source,
          locations: definitions.locations,
        })
      } catch (failure) {
        if (!fresh()) return
        setIntelligenceStatus('unavailable')
        setIntelligenceMessage(messageOf(failure))
        setNavigationPanel({
          kind: 'message',
          titleKey: 'navigation.title',
          message: messageOf(failure),
        })
      }
    })()
  }, [navigateToLocation])
  handlePythonNavigateRef.current = handlePythonNavigate

  const createEditor = useCallback((initial: InitialEditor): boolean => {
    const host = hostRef.current
    if (host === null) return false
    if (viewRef.current !== null) return true
    const language = languageForFile(fileNameOf(parsedRef.current?.path ?? ''))
    setLanguageId(language.id)
    const completionSource = language.id === 'python'
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
              enabled: pythonIntelligenceSettingsRef.current.enabled
                && pythonIntelligenceSettingsRef.current.completion,
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
      : language.completionSource
    const navigationExtensions = language.id === 'python'
      ? pythonNavigationExtensions({
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
              enabled: pythonIntelligenceSettingsRef.current.enabled,
            }
          },
          onNavigate: click => handlePythonNavigateRef.current(click),
          onReady: () => {
            if (mountedRef.current) {
              setIntelligenceStatus('ready')
              setIntelligenceMessage(undefined)
            }
          },
          onError: message => {
            if (mountedRef.current) {
              setIntelligenceStatus('unavailable')
              setIntelligenceMessage(message)
            }
          },
        })
      : undefined
    const editorOptions = {
      language,
      indentation: indentationSettingsRef.current,
      readOnly: initial.readOnly,
      readOnlyCompartment: readOnlyCompartmentRef.current,
      indentationCompartment: indentationCompartmentRef.current,
      languageCompartment: languageCompartmentRef.current,
      javaEditingAssistanceEnabled: javaEditingAssistanceRef.current.enabled,
      htmlEditingAssistanceEnabled: htmlEditingAssistanceRef.current.enabled,
      onUpdate,
      ...(completionSource === undefined ? {} : { completionSource }),
      ...(navigationExtensions === undefined ? {} : { extraExtensions: navigationExtensions }),
    }
    let htmlInitializationFailed = language.initializationError === true
    let state: EditorState
    try {
      state = EditorState.create({
        doc: initial.text,
        extensions: buildEditorExtensions(editorOptions),
      })
    } catch (failure) {
      if (language.id !== 'html' || !htmlEditingAssistanceRef.current.enabled) throw failure
      htmlInitializationFailed = true
      state = EditorState.create({
        doc: initial.text,
        extensions: buildEditorExtensions({
          ...editorOptions,
          htmlEditingAssistanceEnabled: false,
        }),
      })
    }
    const view = new EditorView({ state, parent: host })
    viewRef.current = view
    bindHtmlFeatureHost(view, {
      currentPath: () => parsedRef.current?.path ?? '',
      report: code => reportHtmlCode(code),
      revealAnchor: (from, to) => revealHtmlOffset(from, to),
      openFile: targetPath => {
        void (async () => {
          const parsed = parsedRef.current
          if (parsed === null || viewRef.current === null) return
          try {
            const result = await statFile({ sessionId: parsed.sessionId, path: targetPath })
            if (!mountedRef.current) return
            if (!result.exists) {
              reportHtmlCode('missing-file')
              return
            }
            if (!navigationCoordinator.openResource(parsed.sessionId, targetPath)) {
              reportHtmlCode('unresolved-path')
            }
          } catch {
            if (mountedRef.current) reportHtmlCode('unresolved-path')
          }
        })()
      },
    })
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
    setHtmlStatus(language.id === 'html'
      ? !htmlEditingAssistanceRef.current.enabled
        ? 'disabled'
        : htmlInitializationFailed
          ? 'error'
          : 'ready'
      : undefined)
    const semanticLanguage = language.id === 'python' ? language.id : undefined
    const semanticEnabled = semanticLanguage === 'python' && pythonIntelligenceSettingsRef.current.enabled
    setIntelligenceStatus(semanticEnabled ? 'starting' : 'disabled')
    if (semanticLanguage !== undefined) queueMicrotask(() => { void syncIntelligenceDocument() })
    setPhase('editing')
    return true
  }, [onUpdate, syncIntelligenceDocument, tab.id])

  const applySnapshot = useCallback((snapshot: TextFileSnapshot, currentRequest: RendererRequest) => {
    const observed = metaVersionRef.current ?? ''
    const view = viewRef.current
    if (view === null) {
      const initial = initialDocumentState(snapshot)
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
      })
      if (!created) {
        setPhase('error')
        setError({ kind: 'load', message: tRef.current('error.editorFailed') })
        currentRequest.failed()
        return
      }
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

    suppressSaveRef.current = true
    try {
      applyTextPreservingSelection(view, snapshot.content)
    } finally {
      suppressSaveRef.current = false
    }
    savedTextRef.current = snapshot.content
    baseVersionRef.current = snapshot.version
    newlineRef.current = snapshot.newline
    bomRef.current = snapshot.bom
    dirtyRef.current = false
    setDirty(false)
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
  }, [createEditor])

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
          destroyEditor()
          if (!mountedRef.current) return
          setNotice(unsupportedNotice(result, tRef.current))
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
  }, [request?.revision, tab.signal, address, applySnapshot, destroyEditor, handleLoadError])

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
        destroyEditor()
        if (!mountedRef.current) return
        setNotice(unsupportedNotice(result, tRef.current))
        setPhase('notice')
        setConflict(null)
        return
      }
      savedTextRef.current = result.content
      baseVersionRef.current = result.version
      newlineRef.current = result.newline
      bomRef.current = result.bom
      setNewlineStyle(result.newline)
      dirtyRef.current = false
      setDirty(false)
      notifyHtmlPreviewController()
      setFileWritable(result.writable)
      setExternal(false)
      setConflict(null)
      if (viewRef.current === null) {
        const created = createEditor({
          text: result.content,
          readOnly: !result.writable,
        })
        if (!created) {
          setPhase('error')
          setError({ kind: 'load', message: tRef.current('error.editorFailed') })
          return
        }
      } else {
        suppressSaveRef.current = true
        try {
          applyTextPreservingSelection(viewRef.current, result.content)
        } finally {
          suppressSaveRef.current = false
        }
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
  }, [createEditor, destroyEditor])

  const doSave = useCallback(async (): Promise<boolean> => {
    let saved = false
    await saveQueueRef.current.request(async () => {
      const view = viewRef.current
      const parsed = parsedRef.current
      if (view === null || parsed === null) return
      if (readOnlyRef.current) {
        setError({ kind: 'readOnly', message: tRef.current('error.readOnly') })
        setStatus('error')
        return
      }
      if (conflictRef.current !== null) return
      const content = view.state.doc.toString()
      if (content === savedTextRef.current) {
        dirtyRef.current = false
        setDirty(false)
        setStatus('saved')
        saved = true
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
        // captured remain dirty and are written by the queued follow-up save.
        const currentContent = viewRef.current?.state.doc.toString() ?? content
        const reconciled = reconcileSaveSuccess(currentContent, content, result)
        savedTextRef.current = reconciled.savedText
        baseVersionRef.current = reconciled.baseVersion
        const stillDirty = reconciled.dirty
        dirtyRef.current = stillDirty
        setDirty(stillDirty)
        notifyHtmlPreviewController()
        setConflict(null)
        conflictRef.current = null
        setExternal(false)
        setStatus(stillDirty ? 'idle' : 'saved')
        saved = !stillDirty
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
      }
    })
    return saved && !dirtyRef.current && conflictRef.current === null
  }, [])
  doSaveRef.current = doSave

  useEffect(() => {
    const parsed = parseSessionFileAddress(address)
    if (parsed === undefined) return
    const { sessionId, path } = parsed
    return registerOpenDocument({
      sessionId,
      path,
      address,
      tabId: tab.id,
      isDirty: () => dirtyRef.current || conflictRef.current !== null,
      save: async () => {
        await doSaveRef.current()
        return !dirtyRef.current && conflictRef.current === null
      },
      relocate: (nextPath: string) => {
        tab.actions.openResource(sessionFileAddress(sessionId, nextPath), {
          revealIfOpened: true,
        })
        tab.actions.close()
      },
      close: () => { tab.actions.close() },
    })
  }, [address, tab.id, tab.actions])

  const continueEditing = useCallback(() => {
    conflictRef.current = null
    setConflict(null)
  }, [])

  const retryLoad = useCallback(() => {
    requestRef.current?.reload()
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
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!tab.visible || !event.altKey || event.shiftKey) return
      const root = rootRef.current
      const target = event.target
      if (root === null || !(target instanceof Node) || !root.contains(target)) return
      const mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      if (mac ? !event.metaKey || event.ctrlKey : !event.ctrlKey || event.metaKey) return
      const parsed = parsedRef.current
      if (parsed === null || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
      event.preventDefault()
      event.stopPropagation()
      const action = event.key === 'ArrowLeft'
        ? navigationCoordinator.back(parsed.sessionId)
        : navigationCoordinator.forward(parsed.sessionId)
      void action.then(opened => {
        if (!opened && mountedRef.current) {
          setNavigationPanel({
            kind: 'message',
            titleKey: 'navigation.title',
            message: tRef.current('navigation.openFailed'),
          })
        }
      })
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [tab.visible])

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
    const params = tab.navigation.params
    const hasRange = typeof params?.character === 'number'
      && typeof params.endLine === 'number'
      && typeof params.endCharacter === 'number'
    const expectedExcerpt = params?.codecraftNavigationExcerpt
    const currentLine = view.state.doc.line(Math.min(Math.max(1, Math.floor(line)), view.state.doc.lines)).text
    const excerptIsTruncated = typeof expectedExcerpt === 'string'
      && expectedExcerpt.length === 500
      && expectedExcerpt.endsWith('...')
    if (typeof expectedExcerpt === 'string' && !excerptIsTruncated && currentLine !== expectedExcerpt) {
      if (typeof params?.codecraftNavigationId === 'string'
        && typeof params.codecraftNavigationPath === 'string') {
        navigationCoordinator.acknowledge(params.codecraftNavigationId, params.codecraftNavigationPath, false)
      }
      setNavigationPanel({
        kind: 'message',
        titleKey: 'navigation.title',
        message: tRef.current('navigation.targetChanged'),
      })
      return
    }
    const revealed = hasRange
      ? revealRange(view, {
          start: { line: line - 1, character: params.character as number },
          end: { line: params.endLine as number, character: params.endCharacter as number },
        })
      : (revealLine(view, line), true)
    if (revealed
      && typeof params?.codecraftNavigationId === 'string'
      && typeof params.codecraftNavigationPath === 'string') {
      navigationCoordinator.acknowledge(params.codecraftNavigationId, params.codecraftNavigationPath)
    } else if (!revealed
      && typeof params?.codecraftNavigationId === 'string'
      && typeof params.codecraftNavigationPath === 'string') {
      navigationCoordinator.acknowledge(params.codecraftNavigationId, params.codecraftNavigationPath, false)
      setNavigationPanel({
        kind: 'message',
        titleKey: 'navigation.title',
        message: tRef.current('navigation.targetChanged'),
      })
    }
  }, [phase, tab.navigation.revision, tab.navigation.params])

  useEffect(() => () => {
    if (cursorFrameRef.current !== 0) window.cancelAnimationFrame(cursorFrameRef.current)
    if (flashTimerRef.current !== undefined) window.clearTimeout(flashTimerRef.current)
    if (intelligenceTimerRef.current !== undefined) window.clearTimeout(intelligenceTimerRef.current)
    if (htmlDiagnosticTimerRef.current !== undefined) window.clearTimeout(htmlDiagnosticTimerRef.current)
    if (noticeTimerRef.current !== undefined) window.clearTimeout(noticeTimerRef.current)
    navigationAbortRef.current?.abort()
    destroyEditor()
  }, [destroyEditor])

  if (props.content.kind !== 'renderer') return null

  const pending = phase === 'loading'
  const statusKey = editorStatusKey({
    writable: fileWritable,
    conflicted: conflict !== null,
    external,
    saveFailed: status === 'error',
  })

  let banner: { tone: 'warn' | 'error', title: string, detail: string, actions: BannerAction[] } | null = null
  if (conflict !== null) {
    if (conflict.kind === 'external') {
      banner = {
        tone: 'warn',
        title: t('banner.external.title'),
        detail: t('banner.external.detail'),
        actions: [
          { label: t('action.reload'), variant: 'primary', onClick: () => { void reloadFromDisk() } },
          { label: t('action.keep'), variant: 'quiet', onClick: continueEditing },
        ],
      }
    } else if (conflict.kind === 'save') {
      banner = {
        tone: 'warn',
        title: t('banner.save.title'),
        detail: t('banner.save.detail'),
        actions: [
          { label: t('action.reload'), variant: 'primary', onClick: () => { void reloadFromDisk() } },
          { label: t('action.keep'), variant: 'quiet', onClick: continueEditing },
        ],
      }
    } else {
      banner = {
        tone: 'warn',
        title: t('banner.deleted.title'),
        detail: t('banner.deleted.detail'),
        actions: [
          { label: t('action.retry'), variant: 'primary', onClick: retryLoad },
          { label: t('action.keep'), variant: 'quiet', onClick: continueEditing },
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
      {featureNotice !== null && (
        <div className={`${ROOT_CLASS}-toast`} data-tone={featureNotice.tone} role="status">
          {featureNotice.text}
        </div>
      )}
      {previewPrompt && (
        <div className={`${ROOT_CLASS}-banner`} data-tone="warn" role="status">
          <div className={`${ROOT_CLASS}-banner-text`}>
            <div className={`${ROOT_CLASS}-banner-title`}>{t('preview.confirm.title')}</div>
            <div className={`${ROOT_CLASS}-banner-detail`}>{t('preview.confirm.detail')}</div>
          </div>
          <div className={`${ROOT_CLASS}-banner-actions`}>
            <button
              type="button"
              className={`${ROOT_CLASS}-button`}
              data-variant="primary"
              onClick={() => { void saveAndPreview() }}
            >
              {t('preview.confirm.save')}
            </button>
            <button
              type="button"
              className={`${ROOT_CLASS}-button`}
              data-variant="quiet"
              onClick={() => setPreviewPrompt(false)}
            >
              {t('preview.confirm.cancel')}
            </button>
          </div>
        </div>
      )}
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
      {navigationPanel !== null && (
        <div className={`${ROOT_CLASS}-navigation`} role="dialog" aria-label={t(navigationPanel.titleKey)}>
          <div className={`${ROOT_CLASS}-navigation-header`}>
            <strong>{t(navigationPanel.titleKey)}</strong>
            <button
              type="button"
              className={`${ROOT_CLASS}-button`}
              data-variant="quiet"
              aria-label={t('navigation.close')}
              onClick={() => setNavigationPanel(null)}
            >
              ×
            </button>
          </div>
          {navigationPanel.kind === 'loading' && (
            <div className={`${ROOT_CLASS}-navigation-message`}>{t('navigation.loadingDetail')}</div>
          )}
          {navigationPanel.kind === 'message' && (
            <div className={`${ROOT_CLASS}-navigation-message`}>{navigationPanel.message}</div>
          )}
          {navigationPanel.kind === 'locations' && navigationPanel.source !== undefined && (
            <div className={`${ROOT_CLASS}-navigation-list`}>
              {groupedLocations(navigationPanel.locations ?? []).map(group => (
                <div key={group.path} className={`${ROOT_CLASS}-navigation-group`}>
                  <div className={`${ROOT_CLASS}-navigation-group-title`}>{group.path}</div>
                  {group.locations.map(location => {
                    const excerpt = excerptParts(location)
                    return (
                      <button
                        key={`${location.range.start.line}:${location.range.start.character}:${location.range.end.line}:${location.range.end.character}`}
                        type="button"
                        className={`${ROOT_CLASS}-navigation-item`}
                        onClick={() => { void navigateToLocation(navigationPanel.source as NavigationPoint, location) }}
                      >
                        <span className={`${ROOT_CLASS}-navigation-location`}>
                          {location.range.start.line + 1}:{location.range.start.character + 1}
                        </span>
                        {excerpt !== undefined && (
                          <code className={`${ROOT_CLASS}-navigation-excerpt`}>
                            {excerpt.before}<mark>{excerpt.match}</mark>{excerpt.after}
                          </code>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className={`${ROOT_CLASS}-editor`} data-phase={phase}>
        {phase === 'editing' && htmlActiveRef.current && (
          <div className={`${ROOT_CLASS}-html-toolbar`}>
            <nav className={`${ROOT_CLASS}-breadcrumbs`} aria-label={t('html.breadcrumbs')}>
              {htmlCrumbs.length === 0
                ? <span className={`${ROOT_CLASS}-breadcrumbs-empty`}>{t('html.breadcrumbs.empty')}</span>
                : htmlCrumbs.map((crumb, index) => (
                  <span key={`${crumb.from}:${crumb.name}`} className={`${ROOT_CLASS}-breadcrumb`}>
                    {index > 0 && <span className={`${ROOT_CLASS}-breadcrumb-separator`} aria-hidden="true">›</span>}
                    <button
                      type="button"
                      className={`${ROOT_CLASS}-breadcrumb-button`}
                      title={t('html.breadcrumbs.goTo', { name: crumb.name })}
                      onClick={() => revealHtmlOffset(crumb.nameFrom, crumb.nameFrom)}
                    >
                      {crumb.name}
                    </button>
                  </span>
                ))}
            </nav>
            <div className={`${ROOT_CLASS}-html-actions`}>
              <button
                type="button"
                className={`${ROOT_CLASS}-button`}
                data-variant="quiet"
                aria-pressed={outlineOpen}
                onClick={() => {
                  setProblemsOpen(false)
                  setOutlineOpen(open => !open)
                }}
              >
                {t('html.outline')}
              </button>
              <button
                type="button"
                className={`${ROOT_CLASS}-button`}
                data-variant="quiet"
                aria-pressed={problemsOpen}
                onClick={() => {
                  setOutlineOpen(false)
                  setProblemsOpen(open => !open)
                }}
              >
                {t('html.problems')} ({htmlDiagnostics.length})
              </button>
              <button
                type="button"
                className={`${ROOT_CLASS}-button`}
                data-variant="quiet"
                onClick={() => startHtmlRename('tag')}
              >
                {t('html.rename.tag')}
              </button>
              <button
                type="button"
                className={`${ROOT_CLASS}-button`}
                data-variant="quiet"
                onClick={() => startHtmlRename('id')}
              >
                {t('html.rename.id')}
              </button>
              <button
                type="button"
                className={`${ROOT_CLASS}-button`}
                data-variant="quiet"
                title={t('html.format.hint')}
                onClick={() => {
                  const view = viewRef.current
                  if (view === null) return
                  if (view.state.selection.main.empty) formatHtmlDocument(view)
                  else formatHtmlSelection(view)
                }}
              >
                {t('html.format')}
              </button>
              <button
                type="button"
                className={`${ROOT_CLASS}-button`}
                data-variant="quiet"
                title={t('html.template.hint')}
                onClick={() => {
                  const view = viewRef.current
                  if (view !== null) insertHtmlTemplate(view)
                }}
              >
                {t('html.template')}
              </button>
            </div>
          </div>
        )}
        {phase === 'editing' && htmlActiveRef.current && htmlRename !== null && (
          <HtmlRenamePanel
            kind={htmlRename.kind}
            newName={htmlRename.newName}
            {...(htmlRename.plan === undefined ? {} : { plan: htmlRename.plan })}
            {...(htmlRename.error === undefined ? {} : { error: htmlRename.error })}
            document={viewRef.current?.state.doc}
            path={parsedRef.current?.path ?? ''}
            onNameChange={newName => setHtmlRename({
              kind: htmlRename.kind,
              position: htmlRename.position,
              newName,
            })}
            onPreview={previewHtmlRename}
            onConfirm={() => { void confirmHtmlRename() }}
            onCancel={() => setHtmlRename(null)}
            t={t}
          />
        )}
        <div className={`${ROOT_CLASS}-editor-row`}>
          <div
            ref={hostRef}
            className={`${ROOT_CLASS}-editor-host`}
            style={{ display: phase === 'editing' ? undefined : 'none' }}
          />
          {phase === 'editing' && htmlActiveRef.current && outlineOpen && (
            <HtmlOutlinePanel
              nodes={htmlOutlineNodes}
              onClose={() => setOutlineOpen(false)}
              onSelect={node => revealHtmlOffset(node.nameFrom, node.nameFrom)}
              t={t}
            />
          )}
          {phase === 'editing' && htmlActiveRef.current && problemsOpen && (
            <HtmlProblemsPanel
              diagnostics={htmlDiagnostics}
              document={viewRef.current?.state.doc}
              onClose={() => setProblemsOpen(false)}
              onSelect={diagnostic => revealHtmlOffset(diagnostic.from, diagnostic.to)}
              t={t}
            />
          )}
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
      </div>
      <footer className={`${ROOT_CLASS}-status`} aria-live="polite">
        {phase === 'editing' && navigationAddress !== undefined && (
          <button
            type="button"
            className={`${ROOT_CLASS}-navigation-history`}
            disabled={!navigationHistory.canBack}
            title={t('navigation.backHint')}
            aria-label={t('navigation.back')}
            onClick={() => { void navigationCoordinator.back(navigationAddress.sessionId) }}
          >
            ←
          </button>
        )}
        {phase === 'editing' && navigationAddress !== undefined && (
          <button
            type="button"
            className={`${ROOT_CLASS}-navigation-history`}
            disabled={!navigationHistory.canForward}
            title={t('navigation.forwardHint')}
            aria-label={t('navigation.forward')}
            onClick={() => { void navigationCoordinator.forward(navigationAddress.sessionId) }}
          >
            →
          </button>
        )}
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
            {t(`status.intelligence.python.${intelligenceStatus}`)}
          </span>
        )}
        {phase === 'editing' && htmlStatus !== undefined && (
          <span
            className={`${ROOT_CLASS}-status-item`}
            data-state={htmlStatus === 'error' ? 'error' : undefined}
          >
            {t(`status.html.${htmlStatus}`)}
          </span>
        )}
        {pending && <span className={`${ROOT_CLASS}-status-item`}>{t('status.loading')}</span>}
        <span className={`${ROOT_CLASS}-status-spacer`} />
        {phase === 'editing' && (
          <span
            className={`${ROOT_CLASS}-status-item`}
            data-state={statusKey === 'status.saveError'
              ? 'error'
              : statusKey === 'status.external'
                ? 'dirty'
                : undefined}
          >
            {t(statusKey)}
          </span>
        )}
      </footer>
    </div>
  )
}
