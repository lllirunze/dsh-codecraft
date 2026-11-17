import type { ReactElement } from 'react'

import { fileNameOf, parseSessionFileAddress } from '../address.js'
import type { TabInfo } from '../dsh.js'
import { FileIcon } from '../icons/FileIcon.js'
import type { FileIconInput } from '../icons/file-icon-resolver.js'

/** Stable DSH type id that owns native file tabs and their title slot. */
export const DOCUMENT_PREVIEW_TAB_ID = '@deepseek-ai/dsh-client-ui-sidebar-documentpreview'

export interface DocumentTabTitleProps {
  useTabInfo: () => { tab: TabInfo }
}

/** Adapt a native Session file address to the same icon input used by Explorer. */
export function documentTabFileIconInput(address: string): FileIconInput | undefined {
  const parsed = parseSessionFileAddress(address)
  if (parsed === undefined) return undefined
  return {
    name: fileNameOf(parsed.path),
    path: parsed.path,
    kind: 'file',
  }
}

/** Keep DSH's title text while adding the shared Material icon for real file tabs. */
export function DocumentTabTitle({ useTabInfo }: DocumentTabTitleProps): ReactElement {
  const { tab } = useTabInfo()
  const input = documentTabFileIconInput(tab.navigation.address)
  if (input === undefined) return <>{tab.title}</>

  return (
    <span className="dsh-codecraft-document-tab-title">
      <FileIcon {...input} className="dsh-codecraft-document-tab-icon" />
      <span className="dsh-codecraft-document-tab-label">{tab.title}</span>
    </span>
  )
}
