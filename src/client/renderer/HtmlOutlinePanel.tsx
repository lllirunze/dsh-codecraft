/** Nested, collapsible HTML document Outline shown beside the editor. */

import { useState, type ReactElement } from 'react'
import type { HtmlOutlineNode } from '../languages/html/features/outline.js'
import { ROOT_CLASS } from '../theme.js'

interface HtmlOutlinePanelProps {
  nodes: readonly HtmlOutlineNode[]
  onSelect: (node: HtmlOutlineNode) => void
  onClose: () => void
  t: (key: string, params?: Record<string, string | number>) => string
}

interface BranchProps {
  nodes: readonly HtmlOutlineNode[]
  depth: number
  collapsed: ReadonlySet<number>
  onToggle: (from: number) => void
  onSelect: (node: HtmlOutlineNode) => void
  t: HtmlOutlinePanelProps['t']
}

function OutlineBranch(props: BranchProps): ReactElement {
  return (
    <ul className={`${ROOT_CLASS}-outline-list`} role={props.depth === 0 ? 'tree' : 'group'}>
      {props.nodes.map(node => {
        const hasChildren = node.children.length > 0
        const isCollapsed = props.collapsed.has(node.from)
        return (
          <li key={`${node.from}:${node.tag}`} className={`${ROOT_CLASS}-outline-item`} role="treeitem" aria-expanded={hasChildren ? !isCollapsed : undefined}>
            <div className={`${ROOT_CLASS}-outline-row`} style={{ paddingLeft: `${props.depth * 12}px` }}>
              {hasChildren ? (
                <button
                  type="button"
                  className={`${ROOT_CLASS}-outline-toggle`}
                  aria-label={props.t('html.outline.toggle', { name: node.tag })}
                  aria-expanded={!isCollapsed}
                  onClick={() => props.onToggle(node.from)}
                >
                  {isCollapsed ? '▸' : '▾'}
                </button>
              ) : <span className={`${ROOT_CLASS}-outline-toggle`} aria-hidden="true" />}
              <button
                type="button"
                className={`${ROOT_CLASS}-outline-label`}
                title={props.t('html.outline.goTo', { name: node.tag })}
                onClick={() => props.onSelect(node)}
              >
                {node.label}
              </button>
            </div>
            {hasChildren && !isCollapsed && (
              <OutlineBranch
                nodes={node.children}
                depth={props.depth + 1}
                collapsed={props.collapsed}
                onToggle={props.onToggle}
                onSelect={props.onSelect}
                t={props.t}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function HtmlOutlinePanel(props: HtmlOutlinePanelProps): ReactElement {
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(() => new Set())
  const toggle = (from: number): void => {
    setCollapsed(current => {
      const next = new Set(current)
      if (next.has(from)) next.delete(from)
      else next.add(from)
      return next
    })
  }
  return (
    <aside className={`${ROOT_CLASS}-outline`} aria-label={props.t('html.outline')}>
      <div className={`${ROOT_CLASS}-outline-header`}>
        <strong>{props.t('html.outline')}</strong>
        <button
          type="button"
          className={`${ROOT_CLASS}-button`}
          data-variant="quiet"
          aria-label={props.t('html.outline.close')}
          onClick={props.onClose}
        >
          ×
        </button>
      </div>
      {props.nodes.length === 0
        ? <div className={`${ROOT_CLASS}-outline-empty`}>{props.t('html.outline.empty')}</div>
        : (
          <OutlineBranch
            nodes={props.nodes}
            depth={0}
            collapsed={collapsed}
            onToggle={toggle}
            onSelect={props.onSelect}
            t={props.t}
          />
        )}
    </aside>
  )
}
