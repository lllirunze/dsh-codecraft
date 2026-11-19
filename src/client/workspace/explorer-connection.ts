import { ApiCallError } from '../api.js'
import type { MessageKey } from '../i18n/contract.js'

export type ExplorerConnectionPhase =
  | 'connected'
  | 'disconnected'
  | 'refreshing'
  | 'refresh-failed'
  | 'session-ended'

export interface ExplorerConnectionState {
  phase: ExplorerConnectionPhase
  detailKey?: MessageKey
}

export interface ExplorerDisconnectedView {
  visible: boolean
}

/** Resolve the disconnected card without treating a recovered root as stale. */
export function explorerDisconnectedView(
  sessionAvailable: boolean,
  state: ExplorerConnectionState,
): ExplorerDisconnectedView {
  return { visible: !sessionAvailable || state.phase !== 'connected' }
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

