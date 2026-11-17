import type { ReactElement } from 'react'

import logoUrl from '../../assets/favicon.svg'

/** The built logo URL, also used to paint host-owned icon frames. */
export const CODECRAFT_LOGO_URL = logoUrl

/** The glyph size DSH's guide asks a registered entry icon to draw at. */
const DEFAULT_LOGO_SIZE = 20

/** Props shared with DSH's `IconProps`; the guide sizes its glyph to the capsule. */
export interface CodeCraftLogoProps {
  readonly size?: number
  readonly className?: string
}

/** Shared offline CodeCraft logo bundled from the package's manifest asset. */
export function CodeCraftLogo({ size = DEFAULT_LOGO_SIZE, className }: CodeCraftLogoProps): ReactElement {
  return (
    <img
      className={className === undefined ? 'dsh-codecraft-brand-logo' : `dsh-codecraft-brand-logo ${className}`}
      src={logoUrl}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  )
}
