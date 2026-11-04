declare module '@deepseek-ai/dsh-client-ui-primitives' {
  import type { ComponentType } from 'react'

  export const Switch: ComponentType<{
    checked: boolean
    label: string
    disabled?: boolean
    onChange: (checked: boolean) => void
  }>
}
