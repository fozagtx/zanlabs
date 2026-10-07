import { Tooltip } from '@base-ui/react/tooltip'
import type { ReactElement } from 'react'
import styles from './Hint.module.css'

interface HintProps {
  label: string
  /** The element that triggers the tooltip. It is rendered in place of Tooltip.Trigger. */
  children: ReactElement
  side?: 'top' | 'bottom' | 'left' | 'right'
}

/** A small supplementary tooltip. Wrap the app in <Tooltip.Provider> once. */
export function Hint({ label, children, side = 'bottom' }: HintProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner side={side} sideOffset={8}>
          <Tooltip.Popup className={styles.Popup}>{label}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
