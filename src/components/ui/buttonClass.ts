import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'md' | 'sm' | 'icon'

export interface ButtonStyleProps {
  variant?: ButtonVariant
  size?: ButtonSize
}

/** Class names for anything that should look like a button (Base UI parts, links). */
export function buttonClass({ variant = 'secondary', size = 'md' }: ButtonStyleProps = {}, extra?: string) {
  return [styles.Button, variant !== 'secondary' && styles[variant], size !== 'md' && styles[size], extra]
    .filter(Boolean)
    .join(' ')
}
