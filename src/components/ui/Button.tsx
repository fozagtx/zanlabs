import { Button as BaseButton } from '@base-ui/react/button'
import type { ComponentProps } from 'react'
import { buttonClass, type ButtonStyleProps } from './buttonClass'

export function Button({
  variant,
  size,
  className,
  ...props
}: ButtonStyleProps & Omit<BaseButton.Props, 'className'> & { className?: string }) {
  return <BaseButton className={buttonClass({ variant, size }, className)} {...props} />
}

/** Links keep link semantics; they only borrow the button styles (per Base UI guidance). */
export function LinkButton({ variant, size, className, ...props }: ButtonStyleProps & ComponentProps<'a'>) {
  return <a className={buttonClass({ variant, size }, className)} {...props} />
}
