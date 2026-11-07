import { useSyncExternalStore, type ReactElement } from 'react'
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  AUTO_SAVE_INTERVAL_OPTIONS,
  INDENT_SIZE_OPTIONS,
  type AutoSaveInterval,
  type IndentSize,
} from '../../settings/schema.js'
import { editorSettings } from './editor-settings.js'

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
  if (view === 'summary') return t('settings.description')

  const disabled = snapshot.status !== 'ready' || !snapshot.writable || snapshot.saving
  return (
    <div className="dsh-codecraft-settings">
      <div className="dsh-codecraft-settings-heading">
        <div className="dsh-codecraft-settings-title">{t('settings.title')}</div>
        <div className="dsh-codecraft-settings-description">{t('settings.description')}</div>
      </div>
      <section className="dsh-codecraft-settings-group">
        <div className="dsh-codecraft-settings-group-title">{t('settings.group.autoSave')}</div>
        <div className="dsh-codecraft-settings-card">
          <div className="dsh-codecraft-settings-row">
            <div>
              <div className="dsh-codecraft-settings-label">{t('settings.autoSave.label')}</div>
              <div className="dsh-codecraft-settings-hint">{t('settings.autoSave.hint')}</div>
            </div>
            <Switch
              checked={snapshot.settings.autoSave.enabled}
              label={t('settings.autoSave.label')}
              disabled={disabled}
              onChange={(enabled: boolean) => { void editorSettings.setEnabled(enabled) }}
            />
          </div>
          <div className="dsh-codecraft-settings-row">
            <label htmlFor="dsh-codecraft-auto-save-interval">
              <span className="dsh-codecraft-settings-label">{t('settings.interval.label')}</span>
              <span className="dsh-codecraft-settings-hint">{t('settings.interval.hint')}</span>
            </label>
            <select
              id="dsh-codecraft-auto-save-interval"
              className="dsh-codecraft-settings-select"
              value={snapshot.settings.autoSave.intervalSeconds}
              disabled={disabled}
              onChange={(event) => {
                void editorSettings.setInterval(Number(event.target.value) as AutoSaveInterval)
              }}
            >
              {AUTO_SAVE_INTERVAL_OPTIONS.map(seconds => (
                <option key={seconds} value={seconds}>{t('settings.interval.seconds', { seconds })}</option>
              ))}
            </select>
          </div>
        </div>
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
        <div className="dsh-codecraft-settings-group-title">{t('settings.group.javaIntelligence')}</div>
        <div className="dsh-codecraft-settings-card">
          <div className="dsh-codecraft-settings-row">
            <div>
              <div className="dsh-codecraft-settings-label">{t('settings.java.enabled.label')}</div>
              <div className="dsh-codecraft-settings-hint">{t('settings.java.enabled.hint')}</div>
            </div>
            <Switch
              checked={snapshot.javaIntelligence.enabled}
              label={t('settings.java.enabled.label')}
              disabled={disabled}
              onChange={(enabled: boolean) => { void editorSettings.setJavaIntelligenceEnabled(enabled) }}
            />
          </div>
          <div className="dsh-codecraft-settings-row">
            <div>
              <div className="dsh-codecraft-settings-label">{t('settings.java.completion.label')}</div>
              <div className="dsh-codecraft-settings-hint">{t('settings.java.completion.hint')}</div>
            </div>
            <Switch
              checked={snapshot.javaIntelligence.completion}
              label={t('settings.java.completion.label')}
              disabled={disabled || !snapshot.javaIntelligence.enabled}
              onChange={(enabled: boolean) => { void editorSettings.setJavaSemanticCompletionEnabled(enabled) }}
            />
          </div>
          {([
            ['runtime', 'serverRuntimePath', editorSettings.setJavaServerRuntimePath.bind(editorSettings)],
            ['projectRuntime', 'projectRuntimePath', editorSettings.setJavaProjectRuntimePath.bind(editorSettings)],
            ['server', 'serverPath', editorSettings.setJdtLsPath.bind(editorSettings)],
          ] as const).map(([name, field, setter]) => (
            <div className="dsh-codecraft-settings-row" key={name}>
              <label htmlFor={`dsh-codecraft-java-${name}`}>
                <span className="dsh-codecraft-settings-label">{t(`settings.java.${name}.label`)}</span>
                <span className="dsh-codecraft-settings-hint">{t(`settings.java.${name}.hint`)}</span>
              </label>
              <input
                key={snapshot.javaIntelligence[field]}
                id={`dsh-codecraft-java-${name}`}
                className="dsh-codecraft-settings-input"
                defaultValue={snapshot.javaIntelligence[field]}
                placeholder={t('settings.java.path.auto')}
                disabled={disabled}
                onBlur={(event) => {
                  if (event.target.value.trim() !== snapshot.javaIntelligence[field]) void setter(event.target.value)
                }}
              />
            </div>
          ))}
        </div>
      </section>
      {snapshot.status === 'unavailable' && <div className="dsh-codecraft-settings-error">{t('settings.unavailable')}</div>}
      {!snapshot.writable && snapshot.status === 'ready' && <div className="dsh-codecraft-settings-error">{t('settings.readOnly')}</div>}
      {snapshot.error && <div className="dsh-codecraft-settings-error" role="alert">{t('settings.saveFailed')}</div>}
    </div>
  )
}
