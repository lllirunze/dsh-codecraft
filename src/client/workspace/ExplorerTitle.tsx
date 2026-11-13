import type { ReactElement } from 'react'

import { FileIcon } from '../icons/FileIcon.js'

export interface ExplorerTitleProps {
  t: (key: string) => string
}

/** Keyed title contribution for the CodeCraft Explorer native tab. */
export function ExplorerTitle({ t }: ExplorerTitleProps): ReactElement {
  return (
    <span className="cc-explorer-tab-title">
      <FileIcon
        className="cc-explorer-tab-icon"
        name="workspace"
        kind="root"
        expanded
      />
      <span>{t('explorer.title')}</span>
    </span>
  )
}
