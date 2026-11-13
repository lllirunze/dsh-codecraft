import { installMaterialIcons, materialIconStatus } from '../api.js'
import { MATERIAL_ICON_VERSION } from './material-icons.generated.js'

export type MaterialIconStateKind = 'loading' | 'not-installed' | 'installed' | 'installing' | 'error'

export interface MaterialIconSnapshot {
  status: MaterialIconStateKind
  version: string
  iconCount: number
  error?: string
}

type Listener = () => void

class MaterialIconState {
  private snapshot: MaterialIconSnapshot = {
    status: 'loading',
    version: MATERIAL_ICON_VERSION,
    iconCount: 0,
  }
  private readonly listeners = new Set<Listener>()

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly getSnapshot = (): MaterialIconSnapshot => this.snapshot

  async refresh(signal?: AbortSignal): Promise<void> {
    try {
      const result = await materialIconStatus(signal)
      this.set({
        status: result.installed ? 'installed' : 'not-installed',
        version: result.version,
        iconCount: result.iconCount,
      })
    } catch (error) {
      if (signal?.aborted) return
      this.set({
        status: 'error',
        version: MATERIAL_ICON_VERSION,
        iconCount: 0,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async install(): Promise<void> {
    if (this.snapshot.status === 'installing') return
    this.set({
      status: 'installing',
      version: MATERIAL_ICON_VERSION,
      iconCount: this.snapshot.iconCount,
    })
    try {
      const result = await installMaterialIcons()
      this.set({
        status: result.installed ? 'installed' : 'not-installed',
        version: result.version,
        iconCount: result.iconCount,
      })
    } catch (error) {
      this.set({
        status: 'error',
        version: MATERIAL_ICON_VERSION,
        iconCount: 0,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private set(snapshot: MaterialIconSnapshot): void {
    this.snapshot = snapshot
    for (const listener of this.listeners) listener()
  }
}

export const materialIconState = new MaterialIconState()
