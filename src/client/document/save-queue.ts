/** Serialize writes while coalescing any number of in-flight edit notifications. */
export class LatestSaveQueue {
  #running = false
  #queued = false
  #active: Promise<void> | undefined

  get running(): boolean {
    return this.#running
  }

  request(saveLatest: () => Promise<void>): Promise<void> {
    if (this.#running) {
      this.#queued = true
      return this.#active ?? Promise.resolve()
    }
    this.#active = this.#drain(saveLatest)
    return this.#active
  }

  async #drain(saveLatest: () => Promise<void>): Promise<void> {
    this.#running = true
    try {
      do {
        this.#queued = false
        await saveLatest()
      } while (this.#queued)
    } finally {
      this.#running = false
      this.#active = undefined
    }
  }
}
