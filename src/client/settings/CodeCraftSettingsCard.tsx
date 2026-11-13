import { useSyncExternalStore, type ReactElement } from 'react'
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  INDENT_SIZE_OPTIONS,
  type IndentSize,
} from '../../settings/schema.js'
import { editorSettings } from './editor-settings.js'
import { materialIconState } from '../icons/material-icon-state.js'

interface SettingsCardProps {
  view: 'summary' | 'settings'
  t: (key: string, params?: Record<string, string | number>) => string
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
  if (view === 'summary') return t('settings.description')

  const disabled = snapshot.status !== 'ready' || !snapshot.writable || snapshot.saving
  return (
    <div className="dsh-codecraft-settings">
      <div className="dsh-codecraft-settings-heading">
        <div className="dsh-codecraft-settings-title">{t('settings.title')}</div>
        <div className="dsh-codecraft-settings-description">{t('settings.description')}</div>
      </div>
      <section className="dsh-codecraft-settings-group">
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
      <section className="dsh-codecraft-settings-group">
        <div className="dsh-codecraft-settings-group-title">{t('settings.group.indentation')}</div>
        <div className="dsh-codecraft-settings-card">
          <div className="dsh-codecraft-settings-row">
            <div>
              <div className="dsh-codecraft-settings-label">{t('settings.indentCharacter.label')}</div>
              <div className="dsh-codecraft-settings-hint">{t('settings.indentCharacter.hint')}</div>
            </div>
            <span className="dsh-codecraft-settings-value">{t('settings.indentCharacter.spaces')}</span>
          </div>
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
                <option key={size} value={size}>{t('settings.indentSize.spaces', { size })}</option>
              ))}
            </select>
          </div>
        </div>
      </section>
      <section className="dsh-codecraft-settings-group">
        <div className="dsh-codecraft-settings-group-title">{t('settings.group.pythonIntelligence')}</div>
        <div className="dsh-codecraft-settings-card">
          <div className="dsh-codecraft-settings-row">
            <div>
              <div className="dsh-codecraft-settings-label">{t('settings.python.enabled.label')}</div>
              <div className="dsh-codecraft-settings-hint">{t('settings.python.enabled.hint')}</div>
            </div>
            <Switch
              checked={snapshot.pythonIntelligence.enabled}
              label={t('settings.python.enabled.label')}
              disabled={disabled}
              onChange={(enabled: boolean) => { void editorSettings.setPythonIntelligenceEnabled(enabled) }}
            />
          </div>
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
      </section>
      <section className="dsh-codecraft-settings-group">
        <div className="dsh-codecraft-settings-group-title">{t('settings.group.javaEditingAssistance')}</div>
        <div className="dsh-codecraft-settings-card">
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
      </section>
      <section className="dsh-codecraft-settings-group">
        <div className="dsh-codecraft-settings-group-title">{t('settings.group.htmlEditingAssistance')}</div>
        <div className="dsh-codecraft-settings-card">
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
      </section>
      {snapshot.status === 'unavailable' && <div className="dsh-codecraft-settings-error">{t('settings.unavailable')}</div>}
      {!snapshot.writable && snapshot.status === 'ready' && <div className="dsh-codecraft-settings-error">{t('settings.readOnly')}</div>}
      {snapshot.error && <div className="dsh-codecraft-settings-error" role="alert">{t('settings.saveFailed')}</div>}
    </div>
  )
}
