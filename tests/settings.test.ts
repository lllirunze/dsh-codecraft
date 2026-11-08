import { describe, expect, it, vi } from 'vitest'
import { autoSaveDelay, canAutoSave } from '../src/client/document/auto-save.js'
import { EditorSettingsStore, type ConfigForm } from '../src/client/settings/editor-settings.js'
import {
  DEFAULT_AUTO_SAVE_SETTINGS,
  DEFAULT_EDITOR_SETTINGS,
  DEFAULT_INDENTATION_SETTINGS,
  DEFAULT_JAVA_EDITING_ASSISTANCE_SETTINGS,
  DEFAULT_PYTHON_INTELLIGENCE_SETTINGS,
  resolveAutoSaveSettings,
  resolveIndentationSettings,
  resolveJavaEditingAssistanceSettings,
  resolvePythonIntelligenceSettings,
} from '../src/settings/schema.js'

describe('resolveAutoSaveSettings', () => {
  it('uses safe defaults for missing and malformed values', () => {
    expect(resolveAutoSaveSettings(undefined)).toEqual(DEFAULT_AUTO_SAVE_SETTINGS)
    expect(resolveAutoSaveSettings({
      editor: { autoSave: { enabled: true, intervalSeconds: 15 } },
    })).toEqual({ enabled: true, intervalSeconds: 30 })
  })

  it('accepts every supported interval', () => {
    for (const intervalSeconds of [10, 30, 60, 120]) {
      expect(resolveAutoSaveSettings({
        editor: { autoSave: { enabled: true, intervalSeconds } },
      })).toEqual({ enabled: true, intervalSeconds })
    }
  })
})

describe('automatic save policy', () => {
  it('converts the configured interval and only admits safe dirty documents', () => {
    expect(autoSaveDelay({ enabled: true, intervalSeconds: 30 })).toBe(30_000)
    expect(canAutoSave({
      editing: true,
      dirty: true,
      readOnly: false,
      saving: false,
      conflicted: false,
    })).toBe(true)

    for (const blocked of ['editing', 'dirty', 'readOnly', 'saving', 'conflicted'] as const) {
      const state = {
        editing: true,
        dirty: true,
        readOnly: false,
        saving: false,
        conflicted: false,
      }
      if (blocked === 'editing' || blocked === 'dirty') state[blocked] = false
      else state[blocked] = true
      expect(canAutoSave(state)).toBe(false)
    }
  })
})

describe('resolveIndentationSettings', () => {
  it('defaults to two spaces and rejects unsupported values', () => {
    expect(resolveIndentationSettings(undefined)).toEqual(DEFAULT_INDENTATION_SETTINGS)
    expect(resolveIndentationSettings({
      editor: { indentation: { useSpaces: false, indentSize: 3 } },
    })).toEqual(DEFAULT_INDENTATION_SETTINGS)
  })

  it('accepts two or four spaces while keeping spaces mandatory', () => {
    for (const indentSize of [2, 4]) {
      expect(resolveIndentationSettings({
        editor: { indentation: { useSpaces: false, indentSize } },
      })).toEqual({ useSpaces: true, indentSize })
    }
  })
})

describe('resolvePythonIntelligenceSettings', () => {
  it('uses bundled and auto-discovered defaults for malformed values', () => {
    expect(resolvePythonIntelligenceSettings(undefined)).toEqual(DEFAULT_PYTHON_INTELLIGENCE_SETTINGS)
    expect(resolvePythonIntelligenceSettings({
      pythonIntelligence: {
        enabled: 'yes',
        completion: null,
        interpreterPath: 3,
        serverPath: false,
      },
    })).toEqual(DEFAULT_PYTHON_INTELLIGENCE_SETTINGS)
  })

  it('accepts booleans and trims explicit paths', () => {
    expect(resolvePythonIntelligenceSettings({
      pythonIntelligence: {
        enabled: false,
        completion: false,
        interpreterPath: ' /workspace/.venv/bin/python ',
        serverPath: ' /tools/pyright-langserver ',
      },
    })).toEqual({
      enabled: false,
      completion: false,
      interpreterPath: '/workspace/.venv/bin/python',
      serverPath: '/tools/pyright-langserver',
    })
  })
})

describe('resolveJavaEditingAssistanceSettings', () => {
  it('defaults missing and malformed values to enabled', () => {
    expect(resolveJavaEditingAssistanceSettings(undefined))
      .toEqual(DEFAULT_JAVA_EDITING_ASSISTANCE_SETTINGS)
    expect(resolveJavaEditingAssistanceSettings({
      javaEditingAssistance: { enabled: 'false' },
    })).toEqual(DEFAULT_JAVA_EDITING_ASSISTANCE_SETTINGS)
  })

  it('accepts explicit Boolean values', () => {
    expect(resolveJavaEditingAssistanceSettings({
      javaEditingAssistance: { enabled: false },
    })).toEqual({ enabled: false })
    expect(resolveJavaEditingAssistanceSettings({
      javaEditingAssistance: { enabled: true },
    })).toEqual({ enabled: true })
  })
})

describe('EditorSettingsStore', () => {
  it('tracks accepted Host settings and writes nested fields immediately', async () => {
    let listener = (): void => {}
    const mutate = vi.fn(async () => true)
    const form: ConfigForm = {
      getSnapshot: () => ({
        status: 'ready',
        writable: true,
        value: {
          editor: {
            autoSave: { enabled: true, intervalSeconds: 60 },
            indentation: { useSpaces: true, indentSize: 4 },
          },
          javaEditingAssistance: { enabled: false },
        },
      }),
      subscribe: next => { listener = next; return () => {} },
      mutate,
    }
    const store = new EditorSettingsStore()
    const unbind = store.bind(form)

    expect(store.getSnapshot().settings).toEqual({
      autoSave: { enabled: true, intervalSeconds: 60 },
      indentation: { useSpaces: true, indentSize: 4 },
    })
    expect(store.getSnapshot().pythonIntelligence).toEqual(DEFAULT_PYTHON_INTELLIGENCE_SETTINGS)
    expect(store.getSnapshot().javaEditingAssistance).toEqual({ enabled: false })
    await expect(store.setInterval(120)).resolves.toBe(true)
    expect(mutate).toHaveBeenCalledWith([{
      op: 'set',
      path: ['editor', 'autoSave', 'intervalSeconds'],
      value: 120,
    }])
    await expect(store.setIndentSize(2)).resolves.toBe(true)
    expect(mutate).toHaveBeenLastCalledWith([{
      op: 'set',
      path: ['editor', 'indentation', 'indentSize'],
      value: 2,
    }])
    await expect(store.setPythonIntelligenceEnabled(false)).resolves.toBe(true)
    expect(mutate).toHaveBeenLastCalledWith([{
      op: 'set',
      path: ['pythonIntelligence', 'enabled'],
      value: false,
    }])
    await expect(store.setJavaEditingAssistanceEnabled(true)).resolves.toBe(true)
    expect(mutate).toHaveBeenLastCalledWith([{
      op: 'set',
      path: ['javaEditingAssistance', 'enabled'],
      value: true,
    }])
    await expect(store.setPythonInterpreterPath(' /workspace/.venv/bin/python ')).resolves.toBe(true)
    expect(mutate).toHaveBeenLastCalledWith([{
      op: 'set',
      path: ['pythonIntelligence', 'interpreterPath'],
      value: '/workspace/.venv/bin/python',
    }])
    listener()
    unbind()
    expect(store.getSnapshot().settings).toEqual(DEFAULT_EDITOR_SETTINGS)
    expect(store.getSnapshot().javaEditingAssistance)
      .toEqual(DEFAULT_JAVA_EDITING_ASSISTANCE_SETTINGS)
  })

  it('keeps the accepted Java value and reports a rejected write', async () => {
    const mutations = [
      vi.fn(async () => false),
      vi.fn(async () => { throw new Error('write failed') }),
    ]
    for (const mutate of mutations) {
      const form: ConfigForm = {
        getSnapshot: () => ({
          status: 'ready',
          writable: true,
          value: { javaEditingAssistance: { enabled: true } },
        }),
        subscribe: () => () => {},
        mutate,
      }
      const store = new EditorSettingsStore()
      store.bind(form)

      await expect(store.setJavaEditingAssistanceEnabled(false)).resolves.toBe(false)
      expect(store.getSnapshot().javaEditingAssistance.enabled).toBe(true)
      expect(store.getSnapshot().error).toBe(true)
    }
  })
})
