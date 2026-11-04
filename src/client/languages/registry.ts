import type { LanguageAdapter } from './base/LanguageAdapter.js'

function extensionOf(name: string): string | undefined {
  const finalSegment = name.replaceAll('\\', '/').split('/').at(-1)?.toLowerCase() ?? ''
  const dot = finalSegment.lastIndexOf('.')
  return dot === -1 ? undefined : finalSegment.slice(dot + 1)
}

/** Ordered, duplicate-safe lookup for independent language adapters. */
export class LanguageRegistry<T extends LanguageAdapter> {
  readonly #byId = new Map<string, T>()
  readonly #byExtension = new Map<string, T>()

  register(adapter: T): void {
    if (this.#byId.has(adapter.id)) throw new Error(`duplicate language id: ${adapter.id}`)
    for (const extension of adapter.extensions) {
      const normalized = extension.toLowerCase().replace(/^\./, '')
      if (normalized.length === 0) throw new Error(`empty extension for language: ${adapter.id}`)
      if (this.#byExtension.has(normalized)) throw new Error(`duplicate language extension: ${normalized}`)
    }
    this.#byId.set(adapter.id, adapter)
    for (const extension of adapter.extensions) {
      this.#byExtension.set(extension.toLowerCase().replace(/^\./, ''), adapter)
    }
  }

  get(id: string): T | undefined {
    return this.#byId.get(id)
  }

  resolve(name: string): T | undefined {
    const extension = extensionOf(name)
    return extension === undefined ? undefined : this.#byExtension.get(extension)
  }

  adapters(): readonly T[] {
    return [...this.#byId.values()]
  }
}
