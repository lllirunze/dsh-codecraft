import { python } from '@codemirror/lang-python'
import { EditorState } from '@codemirror/state'
import { afterEach, describe, expect, it } from 'vitest'
import { identifierRangeAt, protocolPosition } from '../src/client/languages/python/features/navigation.js'
import { navigationCoordinator } from '../src/client/navigation/coordinator.js'
import type { SidebarRightService } from '../src/client/dsh.js'

afterEach(() => {
  navigationCoordinator.clear('session')
})

describe('Python navigation editor guards', () => {
  it('accepts syntax-tree identifiers but rejects strings, comments, and punctuation', () => {
    const doc = 'service.validate_user("validate_user")  # validate_user\n'
    const state = EditorState.create({ doc, extensions: [python()] })
    const property = doc.indexOf('validate_user') + 3
    const string = doc.indexOf('validate_user', property + 1) + 3
    const comment = doc.lastIndexOf('validate_user') + 3

    expect(identifierRangeAt(state, property)).toEqual({
      from: doc.indexOf('validate_user'),
      to: doc.indexOf('validate_user') + 'validate_user'.length,
    })
    expect(identifierRangeAt(state, string)).toBeUndefined()
    expect(identifierRangeAt(state, comment)).toBeUndefined()
    expect(identifierRangeAt(state, doc.indexOf('.'))).toBeUndefined()
  })

  it('uses zero-based UTF-16 positions around emoji', () => {
    const state = EditorState.create({ doc: 'emoji = "😀"\nvalue' })
    expect(protocolPosition(state.doc, state.doc.length)).toEqual({ line: 1, character: 5 })
    expect(protocolPosition(state.doc, 11)).toEqual({ line: 0, character: 11 })
  })
})

describe('native navigation coordinator', () => {
  it('opens Session resources, waits for reveal acknowledgement, and tracks Back and Forward', async () => {
    const calls: Array<{ address: string, params: Record<string, unknown> }> = []
    const opener: SidebarRightService = {
      openResource(address, options) {
        const params = options?.params ?? {}
        calls.push({ address, params })
        queueMicrotask(() => {
          navigationCoordinator.acknowledge(
            String(params.codecraftNavigationId),
            String(params.codecraftNavigationPath),
          )
        })
      },
    }
    const dispose = navigationCoordinator.bind(opener)
    const source = {
      sessionId: 'session',
      path: 'main.py',
      range: { start: { line: 2, character: 4 }, end: { line: 2, character: 10 } },
    }
    const target = {
      sessionId: 'session',
      path: 'services/user.py',
      range: { start: { line: 6, character: 8 }, end: { line: 6, character: 21 } },
    }
    try {
      await expect(navigationCoordinator.navigate(source, target)).resolves.toBe(true)
      expect(calls[0]?.address).toBe('dsh-resource://file/session/session/services/user.py')
      expect(calls[0]?.params).toMatchObject({
        line: 7,
        character: 8,
        endLine: 6,
        endCharacter: 21,
      })
      expect(navigationCoordinator.snapshot('session')).toEqual({ canBack: true, canForward: false })

      await expect(navigationCoordinator.back('session')).resolves.toBe(true)
      expect(calls[1]?.address).toBe('dsh-resource://file/session/session/main.py')
      expect(navigationCoordinator.snapshot('session')).toEqual({ canBack: false, canForward: true })

      await expect(navigationCoordinator.forward('session')).resolves.toBe(true)
      expect(calls[2]?.address).toBe('dsh-resource://file/session/session/services/user.py')
    } finally {
      dispose()
    }
  })

  it('does not acknowledge a reveal from another path', async () => {
    let params: Record<string, unknown> = {}
    const dispose = navigationCoordinator.bind({
      openResource(_address, options) { params = options?.params ?? {} },
    })
    try {
      const pending = navigationCoordinator.navigate({
        sessionId: 'session',
        path: 'main.py',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
      }, {
        sessionId: 'session',
        path: 'target.py',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
      })
      expect(navigationCoordinator.acknowledge(String(params.codecraftNavigationId), 'other.py')).toBe(false)
      expect(navigationCoordinator.acknowledge(String(params.codecraftNavigationId), 'target.py')).toBe(true)
      await expect(pending).resolves.toBe(true)
    } finally {
      dispose()
    }
  })
})
