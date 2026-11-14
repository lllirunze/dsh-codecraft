import { describe, expect, it } from 'vitest'
import { ApiCallError } from '../src/client/api.js'
import {
  activeDocumentBreadcrumb,
  bindDocumentBreadcrumbRuntime,
  documentBreadcrumbNodes,
  setDocumentBreadcrumbController,
  sortBreadcrumbEntries,
} from '../src/client/workspace/document-breadcrumbs.js'
import {
  explorerConnectionFailure,
  explorerDisconnectedView,
} from '../src/client/workspace/explorer-connection.js'
import { CODECRAFT_CSS } from '../src/client/theme.js'

describe('document breadcrumbs', () => {
  it('keeps the file at the right and projects at most three real nodes', () => {
    expect(documentBreadcrumbNodes('workspace', 'index.html').map(node => node.name))
      .toEqual(['workspace', 'index.html'])
    expect(documentBreadcrumbNodes('workspace', 'src/main.py').map(node => node.name))
      .toEqual(['workspace', 'src', 'main.py'])
    expect(documentBreadcrumbNodes('workspace', 'src/components/Button.tsx').map(node => node.name))
      .toEqual(['src', 'components', 'Button.tsx'])
    expect(documentBreadcrumbNodes('workspace', 'src/components/forms/Login.tsx').map(node => node.name))
      .toEqual(['components', 'forms', 'Login.tsx'])
    expect(documentBreadcrumbNodes('workspace', 'a/b/c/d/e.html').map(node => node.name))
      .toEqual(['c', 'd', 'e.html'])
  })

  it('normalizes Windows separators and assigns the required browse contexts', () => {
    expect(documentBreadcrumbNodes('工作 空间', 'src\\组件\\Main.tsx')).toEqual([
      {
        path: 'src',
        name: 'src',
        kind: 'directory',
        browsePath: '',
        selectedPath: 'src',
      },
      {
        path: 'src/组件',
        name: '组件',
        kind: 'directory',
        browsePath: 'src',
        selectedPath: 'src/组件',
      },
      {
        path: 'src/组件/Main.tsx',
        name: 'Main.tsx',
        kind: 'file',
        browsePath: 'src/组件',
      },
    ])
    expect(documentBreadcrumbNodes('workspace', '../escape.ts')).toEqual([])
    expect(documentBreadcrumbNodes('', 'main.ts')).toEqual([])
  })

  it('sorts directories before files with natural stable names', () => {
    const entries = sortBreadcrumbEntries([
      { path: 'file10.ts', name: 'file10.ts', kind: 'file', hidden: false },
      { path: 'z', name: 'z', kind: 'directory', hidden: false },
      { path: 'file2.ts', name: 'file2.ts', kind: 'file', hidden: false },
      { path: 'a', name: 'a', kind: 'directory', hidden: false },
    ])
    expect(entries.map(entry => entry.name)).toEqual(['a', 'z', 'file2.ts', 'file10.ts'])
  })

  it('publishes only live documents backed by a current Session root', () => {
    const unbind = bindDocumentBreadcrumbRuntime(sessionId => sessionId === 's1' ? 'C:\\工作 空间' : undefined)
    const dispose = setDocumentBreadcrumbController({
      absolutePath: 'C:\\工作 空间\\main.ts',
      sessionId: 's1',
      path: 'main.ts',
      openFile() {},
    })
    expect(activeDocumentBreadcrumb('C:\\工作 空间\\main.ts')).toMatchObject({
      workspaceName: '工作 空间',
      sessionId: 's1',
      path: 'main.ts',
    })
    dispose()
    expect(activeDocumentBreadcrumb('C:\\工作 空间\\main.ts')).toBeUndefined()
    unbind()
  })

  it('keeps a usable display name when the workspace is a filesystem root', () => {
    const unbind = bindDocumentBreadcrumbRuntime(() => '/')
    const dispose = setDocumentBreadcrumbController({
      absolutePath: '/main.ts',
      sessionId: 'root-session',
      path: 'main.ts',
      openFile() {},
    })
    expect(activeDocumentBreadcrumb('/main.ts')?.workspaceName).toBe('/')
    dispose()
    unbind()
  })
})

describe('Explorer connection classification', () => {
  it('separates ended Sessions, recoverable channel failures, and ordinary directory errors', () => {
    expect(explorerConnectionFailure(new ApiCallError('session-not-found', 'ended', 404), false))
      .toEqual({ phase: 'session-ended', detailKey: 'explorer.disconnected.ended' })
    expect(explorerConnectionFailure(new ApiCallError('network', 'offline'), false))
      .toEqual({ phase: 'disconnected', detailKey: 'explorer.disconnected.network' })
    expect(explorerConnectionFailure(new ApiCallError('network', 'offline'), true))
      .toEqual({ phase: 'refresh-failed', detailKey: 'explorer.disconnected.refreshFailed' })
    expect(explorerConnectionFailure(new ApiCallError('read-only', 'denied', 403), false))
      .toBeUndefined()
    expect(explorerConnectionFailure(new ApiCallError('not-found', 'missing', 404), false))
      .toBeUndefined()
  })

  it('keeps the ended-session card refreshable and accepts a recovered root', () => {
    expect(explorerDisconnectedView(false, false, { phase: 'connected' })).toEqual({
      visible: true,
      ended: true,
      refreshing: false,
      refreshable: true,
    })
    expect(explorerDisconnectedView(false, false, { phase: 'refreshing' })).toMatchObject({
      visible: true,
      ended: true,
      refreshing: true,
      refreshable: true,
    })
    expect(explorerDisconnectedView(false, true, { phase: 'connected' })).toMatchObject({
      visible: false,
      refreshable: false,
    })
  })

  it('uses the same 11px text size for breadcrumbs and Preview in Browser', () => {
    expect(CODECRAFT_CSS).toMatch(/\.dsh-codecraft-preview-action\s*\{[\s\S]*?font-size:\s*11px;/)
    expect(CODECRAFT_CSS).toMatch(/\.cc-file-breadcrumb-button\s*\{[\s\S]*?font-size:\s*11px;/)
  })
})

