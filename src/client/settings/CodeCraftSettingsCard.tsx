import { useState, useSyncExternalStore, type ReactElement } from 'react'
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  INDENT_SIZE_OPTIONS,
  type IndentSize,
} from '../../settings/schema.js'
import { editorSettings } from './editor-settings.js'
import { materialIconState } from '../icons/material-icon-state.js'
import type { Translate } from '../i18n/contract.js'
import {
  PROGRAMMING_LANGUAGE_ORDER,
  SETTINGS_GROUP_ORDER,
  languageHasDetails,
  toggleExpandedLanguage,
  type ProgrammingLanguageSetting,
} from './settings-layout.js'

interface SettingsCardProps {
  view: 'summary' | 'settings'
  t: Translate
}

export function CodeCraftSettingsCard({ view, t }: SettingsCardProps): ReactElement | string {
  const snapshot = useSyncExternalStore(
    editorSettings.subscribe,
    editorSettings.getSnapshot,
    editorSettings.getSnapshot,
  )
  const icons = useSyncExternalStore(
    materialIconState.subscribe,
    materialIconState.getSnapshot,
    materialIconState.getSnapshot,
  )
  const [expandedLanguages, setExpandedLanguages] = useState<ReadonlySet<ProgrammingLanguageSetting>>(
    () => new Set(),
  )
  if (view === 'summary') return t('settings.description')

  const disabled = snapshot.status !== 'ready' || !snapshot.writable || snapshot.saving
  const renderLanguageMasterSwitch = (language: ProgrammingLanguageSetting): ReactElement => {
    if (language === 'python') {
      const detailsId = 'dsh-codecraft-python-settings-details'
      const expanded = expandedLanguages.has(language)
      return (
        <div
          key={language}
          className="dsh-codecraft-settings-language"
          data-settings-language={language}
        >
          <div className="dsh-codecraft-settings-row">
            <div>
              <div className="dsh-codecraft-settings-label">{t('settings.python.enabled.label')}</div>
              <div className="dsh-codecraft-settings-hint">{t('settings.python.enabled.hint')}</div>
            </div>
            <div className="dsh-codecraft-settings-language-actions">
              <Switch
                checked={snapshot.pythonIntelligence.enabled}
                label={t('settings.python.enabled.label')}
                disabled={disabled}
                onChange={(enabled: boolean) => { void editorSettings.setPythonIntelligenceEnabled(enabled) }}
              />
              {languageHasDetails(language) && (
                <button
                  type="button"
                  className="dsh-codecraft-settings-disclosure"
                  aria-expanded={expanded}
                  aria-controls={detailsId}
                  aria-label={t(expanded
                    ? 'settings.python.details.collapse'
                    : 'settings.python.details.expand')}
                  title={t(expanded
                    ? 'settings.python.details.collapse'
                    : 'settings.python.details.expand')}
                  onClick={() => {
                    setExpandedLanguages(current => toggleExpandedLanguage(current, language))
                  }}
                >
                  <span className="dsh-codecraft-settings-chevron" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <div
            id={detailsId}
            className="dsh-codecraft-settings-language-details"
            hidden={!expanded}
          >
            <div className="dsh-codecraft-settings-row">
              <div>
                <div className="dsh-codecraft-settings-label">{t('settings.python.completion.label')}</div>
                <div className="dsh-codecraft-settings-hint">{t('settings.python.completion.hint')}</div>
              </div>
              <Switch
                checked={snapshot.pythonIntelligence.completion}
                label={t('settings.python.completion.label')}
                disabled={disabled || !snapshot.pythonIntelligence.enabled}
                onChange={(enabled: boolean) => { void editorSettings.setSemanticCompletionEnabled(enabled) }}
              />
            </div>
            <div className="dsh-codecraft-settings-row">
              <label htmlFor="dsh-codecraft-python-path">
                <span className="dsh-codecraft-settings-label">{t('settings.python.interpreter.label')}</span>
                <span className="dsh-codecraft-settings-hint">{t('settings.python.interpreter.hint')}</span>
              </label>
              <input
                key={snapshot.pythonIntelligence.interpreterPath}
                id="dsh-codecraft-python-path"
                className="dsh-codecraft-settings-input"
                defaultValue={snapshot.pythonIntelligence.interpreterPath}
                placeholder={t('settings.python.path.auto')}
                disabled={disabled}
                onBlur={(event) => {
                  if (event.target.value.trim() !== snapshot.pythonIntelligence.interpreterPath) {
                    void editorSettings.setPythonInterpreterPath(event.target.value)
                  }
                }}
              />
            </div>
            <div className="dsh-codecraft-settings-row">
              <label htmlFor="dsh-codecraft-pyright-path">
                <span className="dsh-codecraft-settings-label">{t('settings.python.server.label')}</span>
                <span className="dsh-codecraft-settings-hint">{t('settings.python.server.hint')}</span>
              </label>
              <input
                key={snapshot.pythonIntelligence.serverPath}
                id="dsh-codecraft-pyright-path"
                className="dsh-codecraft-settings-input"
                defaultValue={snapshot.pythonIntelligence.serverPath}
                placeholder={t('settings.python.path.bundled')}
                disabled={disabled}
                onBlur={(event) => {
                  if (event.target.value.trim() !== snapshot.pythonIntelligence.serverPath) {
                    void editorSettings.setPyrightServerPath(event.target.value)
                  }
                }}
              />
            </div>
          </div>
        </div>
      )
    }
    if (language === 'java') {
      return (
        <div
          key={language}
          className="dsh-codecraft-settings-language"
          data-settings-language={language}
        >
          <div className="dsh-codecraft-settings-row">
            <div>
              <div className="dsh-codecraft-settings-label">{t('settings.java.enabled.label')}</div>
              <div className="dsh-codecraft-settings-hint">{t('settings.java.enabled.hint')}</div>
            </div>
            <Switch
              checked={snapshot.javaEditingAssistance.enabled}
              label={t('settings.java.enabled.label')}
              disabled={disabled}
              onChange={(enabled: boolean) => { void editorSettings.setJavaEditingAssistanceEnabled(enabled) }}
            />
          </div>
        </div>
      )
    }
    return (
      <div
        key={language}
        className="dsh-codecraft-settings-language"
        data-settings-language={language}
      >
        <div className="dsh-codecraft-settings-row">
          <div>
            <div className="dsh-codecraft-settings-label">{t('settings.html.enabled.label')}</div>
            <div className="dsh-codecraft-settings-hint">{t('settings.html.enabled.hint')}</div>
          </div>
          <Switch
            checked={snapshot.htmlEditingAssistance.enabled}
            label={t('settings.html.enabled.label')}
            disabled={disabled}
            onChange={(enabled: boolean) => { void editorSettings.setHtmlEditingAssistanceEnabled(enabled) }}
          />
        </div>
      </div>
    )
  }
  return (
    <div className="dsh-codecraft-settings">
      <section
        className="dsh-codecraft-settings-group"
        data-settings-group={SETTINGS_GROUP_ORDER[0]}
      >
        <div className="dsh-codecraft-settings-group-title">{t('settings.group.materialIcons')}</div>
        <div className="dsh-codecraft-settings-card">
          <div className="dsh-codecraft-settings-row">
            <div>
              <div className="dsh-codecraft-settings-label">{t('settings.materialIcons.label')}</div>
              <div className="dsh-codecraft-settings-hint">
                {t('settings.materialIcons.hint', { version: icons.version })}
              </div>
              <div className="dsh-codecraft-settings-hint">
                {icons.status === 'installed'
                  ? t('settings.materialIcons.installed', { count: icons.iconCount })
                  : t('settings.materialIcons.default')}
              </div>
            </div>
            <button
              type="button"
              className="dsh-codecraft-settings-button"
              disabled={icons.status === 'installing'}
              onClick={() => { void materialIconState.install() }}
            >
              {icons.status === 'installing'
                ? t('settings.materialIcons.installing')
                : icons.status === 'installed'
                  ? t('settings.materialIcons.reinstall')
                  : t('settings.materialIcons.install')}
            </button>
          </div>
        </div>
        {icons.status === 'error' && (
          <div className="dsh-codecraft-settings-error" role="alert">
            {t('settings.materialIcons.failed', { error: icons.error ?? '' })}
          </div>
        )}
      </section>
      <section
        className="dsh-codecraft-settings-group"
        data-settings-group={SETTINGS_GROUP_ORDER[1]}
      >
        <div className="dsh-codecraft-settings-group-title">{t('settings.group.indentation')}</div>
        <div className="dsh-codecraft-settings-card">
          <div className="dsh-codecraft-settings-row">
            <label htmlFor="dsh-codecraft-indent-size">
              <span className="dsh-codecraft-settings-label">{t('settings.indentSize.label')}</span>
              <span className="dsh-codecraft-settings-hint">{t('settings.indentSize.hint')}</span>
            </label>
            <select
              id="dsh-codecraft-indent-size"
              className="dsh-codecraft-settings-select"
              value={snapshot.settings.indentation.indentSize}
              disabled={disabled}
              onChange={(event) => {
                void editorSettings.setIndentSize(Number(event.target.value) as IndentSize)
              }}
            >
              {INDENT_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
      </section>
      <section
        className="dsh-codecraft-settings-group"
        data-settings-group={SETTINGS_GROUP_ORDER[2]}
      >
        <div className="dsh-codecraft-settings-group-title">{t('settings.group.programmingLanguages')}</div>
        <div className="dsh-codecraft-settings-card">
          {PROGRAMMING_LANGUAGE_ORDER.map(renderLanguageMasterSwitch)}
        </div>
      </section>
      {snapshot.status === 'unavailable' && <div className="dsh-codecraft-settings-error">{t('settings.unavailable')}</div>}
      {!snapshot.writable && snapshot.status === 'ready' && <div className="dsh-codecraft-settings-error">{t('settings.readOnly')}</div>}
      {snapshot.error && <div className="dsh-codecraft-settings-error" role="alert">{t('settings.saveFailed')}</div>}
    </div>
  )
}
