/**
 * Editor-local theme and stylesheet.
 *
 * Everything is scoped under `.dsh-codecraft`; colors come from DSH's published
 * `--dsw-*` / `--dsh-*` tokens so light and dark mode follow the host. Syntax
 * colors are the only local palette, because DSH does not publish per-token
 * syntax variables for an embedded editor.
 *
 * @module dsh-codecraft/client/theme
 */

import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

const SYNTAX_CSS = `
.dsh-codecraft {
  --cc-syn-keyword: #a626a4;
  --cc-syn-string: #50a14f;
  --cc-syn-number: #986801;
  --cc-syn-comment: #9aa0a6;
  --cc-syn-function: #4078f2;
  --cc-syn-variable: #383a42;
  --cc-syn-type: #c18401;
  --cc-syn-operator: #0184bc;
  --cc-syn-meta: #986801;
  --cc-syn-link: #4078f2;
  --cc-syn-invalid: #e45649;
  --cc-syn-heading: #1f2328;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  background: var(--dsw-alias-bg-base, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2328);
  font-family: var(--dsw-font-family, system-ui, sans-serif);
}
body[data-ds-dark-theme] .dsh-codecraft {
  --cc-syn-keyword: #c678dd;
  --cc-syn-string: #98c379;
  --cc-syn-number: #d19a66;
  --cc-syn-comment: #7f848e;
  --cc-syn-function: #61afef;
  --cc-syn-variable: #e6e6e6;
  --cc-syn-type: #e5c07b;
  --cc-syn-operator: #56b6c2;
  --cc-syn-meta: #e5c07b;
  --cc-syn-link: #7aaaff;
  --cc-syn-invalid: #ff7b72;
  --cc-syn-heading: #f0f0f0;
}
.dsh-codecraft-editor {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: flex;
}
.dsh-codecraft-editor > div {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}
.dsh-codecraft-status {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 24px;
  padding: 0 12px;
  border-top: 0.5px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .08));
  color: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, .45));
  font-size: 11px;
  line-height: 24px;
  white-space: nowrap;
  overflow: hidden;
  user-select: none;
}
.dsh-codecraft-status-spacer { flex: 1 1 auto; }
.dsh-codecraft-status-item { flex: none; }
.dsh-codecraft-status-item[data-state="dirty"] { color: var(--dsw-alias-state-warn-primary, #b76e00); }
.dsh-codecraft-status-item[data-state="error"] { color: var(--dsw-alias-state-error-primary, #d1242f); }
.dsh-codecraft-status-item[data-state="saved"] { color: var(--dsw-alias-state-success-primary, #1a7f37); }
.dsh-codecraft-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 5px;
  border-radius: 50%;
  background: currentColor;
  vertical-align: 1px;
}
.dsh-codecraft-banner {
  flex: none;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, .1));
  background: var(--dsw-alias-state-warn-tertiary, #fff8e6);
  color: var(--dsw-alias-label-primary, #1f2328);
  font-size: 12px;
  line-height: 1.5;
}
.dsh-codecraft-banner[data-tone="error"] {
  background: var(--dsw-alias-state-error-tertiary, #fff0f0);
}
.dsh-codecraft-banner-text { flex: 1 1 auto; min-width: 0; }
.dsh-codecraft-banner-title { font-weight: 600; }
.dsh-codecraft-banner-detail {
  color: var(--dsw-alias-label-secondary, rgba(0, 0, 0, .6));
  overflow-wrap: anywhere;
}
.dsh-codecraft-banner-actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
}
.dsh-codecraft-button {
  appearance: none;
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, .12));
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2328);
  font: inherit;
  font-size: 12px;
  line-height: 20px;
  padding: 1px 9px;
  cursor: pointer;
  white-space: nowrap;
}
.dsh-codecraft-button:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .05));
}
.dsh-codecraft-button[data-variant="primary"] {
  background: var(--dsw-alias-button-primary-fill, #1f6feb);
  border-color: transparent;
  color: var(--dsw-alias-label-primary-foreground, #ffffff);
}
.dsh-codecraft-button[data-variant="primary"]:hover {
  background: var(--dsw-alias-button-primary-hover, #1a5fd0);
}
.dsh-codecraft-button[data-variant="quiet"] {
  background: transparent;
  border-color: transparent;
  color: var(--dsw-alias-label-secondary, rgba(0, 0, 0, .6));
}
.dsh-codecraft-button[data-variant="quiet"]:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .05));
}
.dsh-codecraft-button:disabled { opacity: .5; cursor: default; }
.dsh-codecraft-center {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px 24px;
  text-align: center;
  color: var(--dsw-alias-label-secondary, rgba(0, 0, 0, .6));
  font-size: 13px;
  line-height: 1.6;
}
.dsh-codecraft-center-title {
  color: var(--dsw-alias-label-primary, #1f2328);
  font-weight: 600;
  font-size: 14px;
}
.dsh-codecraft-center-hint {
  max-width: 420px;
  color: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, .45));
  font-size: 12px;
}
.dsh-codecraft-spinner {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, .45));
  animation: dsh-codecraft-pulse 1.1s ease-in-out infinite;
}
@keyframes dsh-codecraft-pulse {
  0%, 100% { opacity: .35; transform: scale(.85); }
  50% { opacity: 1; transform: scale(1); }
}
.dsh-codecraft-settings {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--dsw-alias-label-primary, #1f2328);
}
.dsh-codecraft-settings-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dsh-codecraft-settings-title { font-size: 16px; font-weight: 500; line-height: 24px; }
.dsh-codecraft-settings-description,
.dsh-codecraft-settings-hint {
  color: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, .45));
  font-size: 12px;
  line-height: 18px;
}
.dsh-codecraft-settings-card {
  border: .5px solid var(--dsw-alias-settings-card-stroke, rgba(0, 0, 0, .1));
  border-radius: var(--dsw-radius-xl, 16px);
  background: var(--dsw-alias-settings-card-fill, rgba(0, 0, 0, .02));
  overflow: hidden;
}
.dsh-codecraft-settings-row {
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 10px 14px;
}
.dsh-codecraft-settings-row + .dsh-codecraft-settings-row {
  border-top: .5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, .1));
}
.dsh-codecraft-settings-row label {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.dsh-codecraft-settings-label { font-size: 14px; font-weight: 500; line-height: 22px; }
.dsh-codecraft-settings-select {
  box-sizing: border-box;
  width: 132px;
  height: 32px;
  flex: none;
  appearance: none;
  border: .5px solid var(--dsw-alias-border-l4, rgba(0, 0, 0, .16));
  border-radius: var(--dsw-radius-md, 8px);
  background-color: var(--dsw-alias-bg-layer-1, #fff);
  color: var(--dsw-alias-label-primary, #1f2328);
  padding: 0 32px 0 10px;
  font: inherit;
  font-size: 14px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2381858C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-position: right 10px center;
  background-repeat: no-repeat;
}
.dsh-codecraft-settings-select:focus {
  border-color: var(--dsw-alias-state-business-primary, #4078f2);
  outline: none;
}
.dsh-codecraft-settings-select:disabled { cursor: default; opacity: .55; }
.dsh-codecraft-settings-error {
  color: var(--dsw-alias-state-error-primary, #d1242f);
  font-size: 12px;
  line-height: 18px;
}
.dsh-codecraft .cm-editor {
  height: 100%;
  background: transparent;
  outline: none !important;
}
.dsh-codecraft .cm-scroller {
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: var(--dsh-code-font-size, 12.5px);
  line-height: 1.65;
  overflow: auto;
}
.dsh-codecraft .cm-content { padding: 10px 0; }
.dsh-codecraft .cm-line { padding: 0 16px 0 10px; }
.dsh-codecraft .cm-gutters {
  background: transparent;
  color: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, .38));
  border: 0;
}
.dsh-codecraft .cm-lineNumbers .cm-gutterElement {
  min-width: 34px;
  padding: 0 10px 0 12px;
}
.dsh-codecraft .cm-activeLine {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .035));
}
.dsh-codecraft .cm-activeLineGutter {
  background: transparent;
  color: var(--dsw-alias-label-secondary, rgba(0, 0, 0, .62));
}
.dsh-codecraft .cm-foldGutter .cm-gutterElement {
  color: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, .38));
  padding: 0 4px;
}
.dsh-codecraft .cm-foldPlaceholder {
  background: var(--dsw-alias-bg-layer-2, rgba(0, 0, 0, .06));
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, .12));
  color: var(--dsw-alias-label-secondary, rgba(0, 0, 0, .62));
  border-radius: 4px;
  margin: 0 2px;
  padding: 0 4px;
}
.dsh-codecraft .cm-selectionBackground,
.dsh-codecraft .cm-content ::selection {
  background: var(--dsw-alias-bg-document-selection, rgba(64, 120, 242, .22)) !important;
}
.dsh-codecraft .cm-cursor, .dsh-codecraft .cm-dropCursor {
  border-left-color: var(--dsw-alias-label-primary, #1f2328);
}
.dsh-codecraft .cm-matchingBracket {
  background: var(--dsw-alias-state-business-tertiary, rgba(64, 120, 242, .14));
  outline: 0.5px solid var(--dsw-alias-state-business-primary, #4078f2);
}
.dsh-codecraft .cm-nonmatchingBracket {
  color: var(--dsw-alias-state-error-primary, #d1242f);
}
.dsh-codecraft .cm-tooltip {
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, .12));
  color: var(--dsw-alias-label-primary, #1f2328);
  border-radius: 8px;
  box-shadow: var(--dsw-elevation-prominent, 0 8px 24px rgba(0, 0, 0, .14));
  font-size: 12px;
}
.dsh-codecraft .cm-tooltip-autocomplete > ul > li[aria-selected] {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06));
  color: var(--dsw-alias-label-primary, #1f2328);
}
.dsh-codecraft .cm-panels {
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2328);
  border-bottom: 0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, .12));
}
.dsh-codecraft .cm-panels input,
.dsh-codecraft .cm-panels button {
  font: inherit;
  color: inherit;
  background: transparent;
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, .14));
  border-radius: 5px;
}
.dsh-codecraft .cm-searchMatch {
  background: var(--dsw-alias-state-warn-tertiary, rgba(255, 190, 70, .28));
}
.dsh-codecraft .cm-searchMatch.cm-searchMatch-selected {
  background: var(--dsw-alias-state-warn-primary, rgba(255, 150, 40, .45));
}
.dsh-codecraft .cm-placeholder {
  color: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, .4));
}
`

/** The stylesheet injected once per plugin lifetime. */
export const CODECRAFT_CSS = SYNTAX_CSS

/** Marker used by the editor host element. */
export const ROOT_CLASS = 'dsh-codecraft'

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'transparent',
    color: 'var(--dsw-alias-label-primary, #1f2328)',
  },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-content': { caretColor: 'var(--dsw-alias-label-primary, #1f2328)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--dsw-alias-label-primary, #1f2328)' },
  '.cm-activeLine': { backgroundColor: 'var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .035))' },
  '.cm-gutters': { backgroundColor: 'transparent', border: 'none' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--dsw-alias-bg-document-selection, rgba(64, 120, 242, .22))',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'var(--dsw-alias-state-business-tertiary, rgba(64, 120, 242, .14))',
    outline: '0.5px solid var(--dsw-alias-state-business-primary, #4078f2)',
  },
  '.cm-nonmatchingBracket': { color: 'var(--dsw-alias-state-error-primary, #d1242f)' },
  '.cm-tooltip': {
    backgroundColor: 'var(--dsw-alias-bg-layer-2, #ffffff)',
    border: '0.5px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, .12))',
    color: 'var(--dsw-alias-label-primary, #1f2328)',
    borderRadius: '8px',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06))',
    color: 'var(--dsw-alias-label-primary, #1f2328)',
  },
  '.cm-panels': {
    backgroundColor: 'var(--dsw-alias-bg-layer-1, #ffffff)',
    color: 'var(--dsw-alias-label-primary, #1f2328)',
  },
  '.cm-searchMatch': { backgroundColor: 'var(--dsw-alias-state-warn-tertiary, rgba(255, 190, 70, .28))' },
})

const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--cc-syn-keyword)' },
  { tag: [tags.controlKeyword, tags.moduleKeyword, tags.definitionKeyword], color: 'var(--cc-syn-keyword)' },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: 'var(--cc-syn-string)' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: 'var(--cc-syn-number)' },
  { tag: [tags.lineComment, tags.blockComment, tags.docComment], color: 'var(--cc-syn-comment)', fontStyle: 'italic' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.labelName], color: 'var(--cc-syn-function)' },
  { tag: [tags.variableName, tags.propertyName, tags.attributeName], color: 'var(--cc-syn-variable)' },
  { tag: [tags.typeName, tags.className, tags.namespace, tags.tagName], color: 'var(--cc-syn-type)' },
  { tag: [tags.operator, tags.punctuation, tags.bracket, tags.separator], color: 'var(--cc-syn-operator)' },
  { tag: [tags.meta, tags.annotation, tags.processingInstruction, tags.documentMeta], color: 'var(--cc-syn-meta)' },
  { tag: [tags.heading, tags.heading1, tags.heading2, tags.heading3, tags.strong], color: 'var(--cc-syn-heading)', fontWeight: '600' },
  { tag: [tags.link], color: 'var(--cc-syn-link)', textDecoration: 'underline' },
  { tag: [tags.emphasis], fontStyle: 'italic' },
  { tag: [tags.strikethrough], textDecoration: 'line-through' },
  { tag: [tags.invalid], color: 'var(--cc-syn-invalid)' },
])

/** Extensions that give the editor DSH's visual language. */
export function editorThemeExtensions(): Extension[] {
  return [editorTheme, syntaxHighlighting(highlightStyle)]
}
