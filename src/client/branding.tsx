import type { ReactElement } from 'react'

import logoUrl from '../../assets/favicon.svg'

/** Shared offline CodeCraft logo bundled from the package's manifest asset. */
export function CodeCraftLogo(): ReactElement {
  return (
    <img
      className="dsh-codecraft-brand-logo"
      src={logoUrl}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  )
}
