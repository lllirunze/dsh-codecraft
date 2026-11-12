/** Current-tab HTML diagnostics list. */

import type { ReactElement } from 'react'
import type { Text } from '@codemirror/state'
import type { HtmlDiagnostic } from '../languages/html/features/diagnostics.js'
import { ROOT_CLASS } from '../theme.js'

interface HtmlProblemsPanelProps {
  diagnostics: readonly HtmlDiagnostic[]
  document: Text | undefined
  onSelect: (diagnostic: HtmlDiagnostic) => void
  onClose: () => void
  t: (key: string, params?: Record<string, string | number>) => string
}

function location(document: Text | undefined, diagnostic: HtmlDiagnostic): string {
  if (document === undefined) return ''
  const line = document.lineAt(Math.min(diagnostic.from, document.length))
  return `${line.number}:${diagnostic.from - line.from + 1}`
}

export function HtmlProblemsPanel(props: HtmlProblemsPanelProps): ReactElement {
  return (
    <aside className={`${ROOT_CLASS}-outline ${ROOT_CLASS}-problems`} aria-label={props.t('html.problems')}>
      <div className={`${ROOT_CLASS}-outline-header`}>
        <strong>{props.t('html.problems')}</strong>
        <button
          type="button"
          className={`${ROOT_CLASS}-button`}
          data-variant="quiet"
          aria-label={props.t('html.problems.close')}
          onClick={props.onClose}
        >
          ×
        </button>
      </div>
      {props.diagnostics.length === 0
        ? <div className={`${ROOT_CLASS}-outline-empty`}>{props.t('html.problems.empty')}</div>
        : (
          <ul className={`${ROOT_CLASS}-problem-list`}>
            {props.diagnostics.map(diagnostic => (
              <li key={`${diagnostic.ruleId}:${diagnostic.from}:${diagnostic.to}`}>
                <button
                  type="button"
                  className={`${ROOT_CLASS}-problem`}
                  data-severity={diagnostic.severity}
                  onClick={() => props.onSelect(diagnostic)}
                >
                  <span className={`${ROOT_CLASS}-problem-severity`} aria-hidden="true" />
                  <span className={`${ROOT_CLASS}-problem-content`}>
                    <span>{diagnostic.message}</span>
                    <small>{diagnostic.severity} · {diagnostic.ruleId} · {location(props.document, diagnostic)}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
    </aside>
  )
}
