/** Explicit HTML rename input, preview, and confirmation panel. */

import type { ReactElement } from 'react'
import type { Text } from '@codemirror/state'
import type { HtmlRefactorPlan } from '../languages/html/features/refactoring.js'
import { ROOT_CLASS } from '../theme.js'

interface HtmlRenamePanelProps {
  kind: 'tag' | 'id'
  newName: string
  plan?: HtmlRefactorPlan
  error?: string
  path: string
  document: Text | undefined
  onNameChange: (value: string) => void
  onPreview: () => void
  onConfirm: () => void
  onCancel: () => void
  t: (key: string, params?: Record<string, string | number>) => string
}

function location(document: Text | undefined, from: number): string {
  if (document === undefined) return ''
  const line = document.lineAt(Math.min(from, document.length))
  return `${line.number}:${from - line.from + 1}`
}

export function HtmlRenamePanel(props: HtmlRenamePanelProps): ReactElement {
  return (
    <section className={`${ROOT_CLASS}-rename`} aria-label={props.t('html.rename.title')}>
      <div className={`${ROOT_CLASS}-rename-header`}>
        <strong>{props.kind === 'tag' ? props.t('html.rename.tag') : props.t('html.rename.id')}</strong>
        <button type="button" className={`${ROOT_CLASS}-button`} data-variant="quiet" onClick={props.onCancel}>×</button>
      </div>
      <div className={`${ROOT_CLASS}-rename-form`}>
        <input
          className={`${ROOT_CLASS}-rename-input`}
          value={props.newName}
          aria-label={props.t('html.rename.newName')}
          onChange={event => props.onNameChange(event.currentTarget.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') props.onPreview()
            if (event.key === 'Escape') props.onCancel()
          }}
          autoFocus
        />
        <button type="button" className={`${ROOT_CLASS}-button`} onClick={props.onPreview}>
          {props.t('html.rename.preview')}
        </button>
      </div>
      {props.error !== undefined && <div className={`${ROOT_CLASS}-rename-error`} role="alert">{props.error}</div>}
      {props.plan !== undefined && (
        <>
          <div className={`${ROOT_CLASS}-rename-summary`}>
            {props.t('html.rename.summary', { count: props.plan.changes.length })}
          </div>
          <div className={`${ROOT_CLASS}-rename-file`}>{props.path}</div>
          <ol className={`${ROOT_CLASS}-rename-list`}>
            {props.plan.changes.map(change => (
              <li key={`${change.from}:${change.to}`}>
                <span>{location(props.document, change.from)}</span>
                <code>{change.before}</code>
                <span aria-hidden="true">→</span>
                <code>{change.insert}</code>
              </li>
            ))}
          </ol>
          <div className={`${ROOT_CLASS}-rename-actions`}>
            <button type="button" className={`${ROOT_CLASS}-button`} data-variant="primary" onClick={props.onConfirm}>
              {props.t('html.rename.confirm')}
            </button>
            <button type="button" className={`${ROOT_CLASS}-button`} data-variant="quiet" onClick={props.onCancel}>
              {props.t('html.rename.cancel')}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
