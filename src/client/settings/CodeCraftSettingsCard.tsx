import { useSyncExternalStore, type ReactElement } from 'react'
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { AUTO_SAVE_INTERVAL_OPTIONS, type AutoSaveInterval } from '../../settings/schema.js'
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
      <div className="dsh-codecraft-settings-card">
        <div className="dsh-codecraft-settings-row">
          <div>
            <div className="dsh-codecraft-settings-label">{t('settings.autoSave.label')}</div>
            <div className="dsh-codecraft-settings-hint">{t('settings.autoSave.hint')}</div>
          </div>
          <Switch
            checked={snapshot.settings.enabled}
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
            value={snapshot.settings.intervalSeconds}
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
      {snapshot.status === 'unavailable' && <div className="dsh-codecraft-settings-error">{t('settings.unavailable')}</div>}
      {!snapshot.writable && snapshot.status === 'ready' && <div className="dsh-codecraft-settings-error">{t('settings.readOnly')}</div>}
      {snapshot.error && <div className="dsh-codecraft-settings-error" role="alert">{t('settings.saveFailed')}</div>}
    </div>
  )
}
