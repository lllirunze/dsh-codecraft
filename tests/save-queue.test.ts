import { describe, expect, it } from 'vitest'
import { LatestSaveQueue } from '../src/client/document/save-queue.js'

describe('LatestSaveQueue', () => {
  it('starts the first save immediately', async () => {
    const queue = new LatestSaveQueue()
    let calls = 0
    const completed = queue.request(async () => { calls += 1 })
    expect(queue.running).toBe(true)
    expect(calls).toBe(1)
    await completed
    expect(queue.running).toBe(false)
  })

  it('coalesces edits during a write into one latest-content follow-up', async () => {
    const queue = new LatestSaveQueue()
    const snapshots: string[] = []
    let content = 'first'
    let release: (() => void) | undefined
    const blocked = new Promise<void>(resolve => { release = resolve })
    const saveLatest = async (): Promise<void> => {
      snapshots.push(content)
      if (snapshots.length === 1) await blocked
    }

    const completed = queue.request(saveLatest)
    content = 'second'
    void queue.request(saveLatest)
    content = 'third'
    void queue.request(saveLatest)
    release?.()
    await completed

    expect(snapshots).toEqual(['first', 'third'])
    expect(queue.running).toBe(false)
  })

  it('recovers after a failed save', async () => {
    const queue = new LatestSaveQueue()
    await expect(queue.request(async () => { throw new Error('write failed') }))
      .rejects.toThrow('write failed')
    await expect(queue.request(async () => undefined)).resolves.toBeUndefined()
  })
})
