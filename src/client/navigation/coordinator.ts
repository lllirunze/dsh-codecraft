import { sessionFileAddress } from '../address.js'
import type { SidebarRightService } from '../dsh.js'
import type { IntelligenceRange } from '../../protocol.js'

export interface NavigationPoint {
  sessionId: string
  path: string
  range: IntelligenceRange
  excerpt?: string
}

interface PendingNavigation {
  path: string
  resolve: (opened: boolean) => void
  timer: ReturnType<typeof setTimeout>
}

interface WorkspaceHistory {
  entries: NavigationPoint[]
  index: number
}

function normalizedPath(path: string): string {
  return path.replaceAll('\\', '/')
}

function samePoint(left: NavigationPoint, right: NavigationPoint): boolean {
  return left.sessionId === right.sessionId
    && normalizedPath(left.path) === normalizedPath(right.path)
    && left.range.start.line === right.range.start.line
    && left.range.start.character === right.range.start.character
}

/** Browser-lifetime bridge from semantic locations to DSH native resource tabs. */
class NavigationCoordinator {
  #opener: SidebarRightService | undefined
  #sequence = 0
  readonly #pending = new Map<string, PendingNavigation>()
  readonly #histories = new Map<string, WorkspaceHistory>()
  readonly #listeners = new Set<() => void>()
  #version = 0

  bind(opener: SidebarRightService): () => void {
    this.#opener = opener
    return () => {
      if (this.#opener === opener) this.#opener = undefined
      for (const pending of this.#pending.values()) {
        clearTimeout(pending.timer)
        pending.resolve(false)
      }
      this.#pending.clear()
      this.#histories.clear()
      this.#emit()
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  version = (): number => this.#version

  snapshot(sessionId: string): { canBack: boolean, canForward: boolean } {
    const history = this.#histories.get(sessionId)
    return {
      canBack: history !== undefined && history.index > 0,
      canForward: history !== undefined && history.index >= 0 && history.index < history.entries.length - 1,
    }
  }

  async navigate(source: NavigationPoint, target: NavigationPoint): Promise<boolean> {
    const opened = await this.#open(target)
    if (!opened) return false
    const history = this.#histories.get(source.sessionId) ?? { entries: [], index: -1 }
    const retained = history.entries.slice(0, history.index + 1)
    if (retained.length === 0 || !samePoint(retained.at(-1) as NavigationPoint, source)) retained.push(source)
    if (!samePoint(retained.at(-1) as NavigationPoint, target)) retained.push(target)
    history.entries = retained.slice(-100)
    history.index = history.entries.length - 1
    this.#histories.set(source.sessionId, history)
    this.#emit()
    return true
  }

  async back(sessionId: string): Promise<boolean> {
    const history = this.#histories.get(sessionId)
    if (history === undefined || history.index <= 0) return false
    const target = history.entries[history.index - 1]
    if (target === undefined || !await this.#open(target)) return false
    history.index -= 1
    this.#emit()
    return true
  }

  async forward(sessionId: string): Promise<boolean> {
    const history = this.#histories.get(sessionId)
    if (history === undefined || history.index < 0 || history.index >= history.entries.length - 1) return false
    const target = history.entries[history.index + 1]
    if (target === undefined || !await this.#open(target)) return false
    history.index += 1
    this.#emit()
    return true
  }

  acknowledge(id: string, path: string, valid = true): boolean {
    const pending = this.#pending.get(id)
    if (pending === undefined || normalizedPath(pending.path) !== normalizedPath(path)) return false
    this.#pending.delete(id)
    clearTimeout(pending.timer)
    pending.resolve(valid)
    return true
  }

  clear(sessionId: string): void {
    if (this.#histories.delete(sessionId)) this.#emit()
  }

  /** Open one native resource tab without waiting for an editor acknowledgement. */
  openResource(sessionId: string, path: string, params?: Record<string, unknown>): boolean {
    const opener = this.#opener
    if (opener === undefined) return false
    try {
      opener.openResource(sessionFileAddress(sessionId, path), {
        ...(params === undefined ? {} : { params }),
        revealIfOpened: true,
      })
      return true
    } catch {
      return false
    }
  }

  async #open(target: NavigationPoint): Promise<boolean> {
    const opener = this.#opener
    if (opener === undefined) return false
    const id = `codecraft-nav-${Date.now().toString(36)}-${(++this.#sequence).toString(36)}`
    const opened = new Promise<boolean>(resolve => {
      const timer = setTimeout(() => {
        if (!this.#pending.delete(id)) return
        resolve(false)
      }, 10_000)
      this.#pending.set(id, { path: target.path, resolve, timer })
    })
    try {
      opener.openResource(sessionFileAddress(target.sessionId, target.path), {
        params: {
          line: target.range.start.line + 1,
          character: target.range.start.character,
          endLine: target.range.end.line,
          endCharacter: target.range.end.character,
          codecraftNavigationId: id,
          codecraftNavigationPath: target.path,
          ...(target.excerpt === undefined ? {} : { codecraftNavigationExcerpt: target.excerpt }),
        },
        revealIfOpened: true,
      })
    } catch {
      const pending = this.#pending.get(id)
      if (pending !== undefined) {
        this.#pending.delete(id)
        clearTimeout(pending.timer)
        pending.resolve(false)
      }
    }
    return opened
  }

  #emit(): void {
    this.#version += 1
    for (const listener of this.#listeners) listener()
  }
}

export const navigationCoordinator = new NavigationCoordinator()
