import { ApiCallError } from '../api.js'

export type ExplorerConnectionPhase =
  | 'connected'
  | 'disconnected'
  | 'refreshing'
  | 'refresh-failed'
  | 'session-ended'

export interface ExplorerConnectionState {
  phase: ExplorerConnectionPhase
  detailKey?: string
}

export interface ExplorerDisconnectedView {
  visible: boolean
  ended: boolean
  refreshing: boolean
  refreshable: boolean
}

/** Resolve the disconnected card without treating a recovered root as stale. */
export function explorerDisconnectedView(
  sessionAvailable: boolean,
  hasWorkspaceRoot: boolean,
  state: ExplorerConnectionState,
): ExplorerDisconnectedView {
  const missingSession = !sessionAvailable && !hasWorkspaceRoot
  const visible = missingSession || state.phase !== 'connected'
  return {
    visible,
    ended: missingSession || state.phase === 'session-ended',
    refreshing: state.phase === 'refreshing',
    refreshable: visible,
  }
}

/** Classify only true channel/session failures as a disconnected Explorer. */
export function explorerConnectionFailure(
  failure: unknown,
  refreshing: boolean,
): ExplorerConnectionState | undefined {
  if (!(failure instanceof ApiCallError)) {
    return { phase: refreshing ? 'refresh-failed' : 'disconnected', detailKey: 'explorer.disconnected.network' }
  }
  if (failure.code === 'session-not-found') {
    return { phase: 'session-ended', detailKey: 'explorer.disconnected.ended' }
  }
  if (failure.code === 'network' || failure.code === 'bad-response'
    || failure.code === 'workspace-unavailable' || failure.code === 'internal') {
    return {
      phase: refreshing ? 'refresh-failed' : 'disconnected',
      detailKey: refreshing ? 'explorer.disconnected.refreshFailed' : 'explorer.disconnected.network',
    }
  }
  return undefined
}

