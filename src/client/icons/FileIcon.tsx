import { useEffect, useMemo, useState, useSyncExternalStore, type ReactElement } from 'react'

import type { FileIconInput } from './file-icon-resolver.js'
import { resolveFileIcon } from './file-icon-resolver.js'
import { loadMaterialIconSvg } from './material-icon-loader.js'
import { materialIconState } from './material-icon-state.js'

export interface FileIconProps extends FileIconInput {
  className?: string
}

interface LoadedIcon {
  fileName: string
  svg: string
}

/** Decorative Explorer icon with a contained built-in fallback. */
export function FileIcon(props: FileIconProps): ReactElement {
  const installation = useSyncExternalStore(
    materialIconState.subscribe,
    materialIconState.getSnapshot,
    materialIconState.getSnapshot,
  )
  const resolved = useMemo(() => resolveFileIcon(props), [
    props.expanded,
    props.kind,
    props.name,
    props.path,
  ])
  const [loaded, setLoaded] = useState<LoadedIcon | null>(null)

  useEffect(() => {
    let active = true
    setLoaded(null)
    if (installation.status === 'installed' && resolved.fileName !== '') {
      void loadMaterialIconSvg(resolved.fileName).then(
        svg => {
          if (active) setLoaded({ fileName: resolved.fileName, svg })
        },
        () => {
          if (active) setLoaded(null)
        },
      )
    }
    return () => { active = false }
  }, [installation.status, resolved.fileName])

  if (installation.status !== 'installed'
    || resolved.fileName === ''
    || loaded?.fileName !== resolved.fileName) {
    return (
      <span
        className={`${props.className ?? ''} cc-explorer-default-icon`}
        aria-hidden="true"
        data-icon-id="default"
      >
        {props.kind === 'directory' || props.kind === 'root' ? '▣' : '▢'}
      </span>
    )
  }

  return (
    <span
      className={`${props.className ?? ''} cc-explorer-material-icon`}
      aria-hidden="true"
      data-icon-id={resolved.id}
      // The Host revalidates this pinned SVG against generated SHA-256 and active-content rules.
      dangerouslySetInnerHTML={{ __html: loaded.svg }}
    />
  )
}
