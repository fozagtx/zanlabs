import { Toast } from '@base-ui/react/toast'
import { useRef, useState } from 'react'
import { CheckIcon, CopyIcon } from '../icons'
import { Button } from './Button'
import styles from './CopyEmail.module.css'

const anchoredToasts = Toast.createToastManager()

/** Mount once near the root. Renders the little confirmations anchored to copy buttons. */
export function AnchoredToasts() {
  return (
    <Toast.Provider toastManager={anchoredToasts}>
      <AnchoredToastList />
    </Toast.Provider>
  )
}

function AnchoredToastList() {
  const { toasts } = Toast.useToastManager()
  return (
    <Toast.Portal>
      <Toast.Viewport className={styles.Viewport}>
        {toasts.map((toast) => (
          <Toast.Positioner key={toast.id} toast={toast} className={styles.Positioner}>
            <Toast.Root toast={toast} className={styles.Toast}>
              <Toast.Content>
                <Toast.Description />
              </Toast.Content>
            </Toast.Root>
          </Toast.Positioner>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  )
}

interface CopyEmailProps {
  email: string
  label?: string
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function CopyEmail({ email, label = 'Copy email', variant }: CopyEmailProps) {
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLButtonElement | null>(null)

  async function handleCopy() {
    let ok = true
    try {
      await navigator.clipboard.writeText(email)
    } catch {
      ok = false
    }
    setCopied(ok)
    anchoredToasts.add({
      description: ok ? 'Email copied to clipboard' : email,
      timeout: ok ? 1800 : 5000,
      positionerProps: { anchor: ref.current, side: 'top', sideOffset: 8 },
      onClose: () => setCopied(false),
    })
  }

  return (
    <Button ref={ref} variant={variant} onClick={handleCopy}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? 'Copied' : label}
    </Button>
  )
}
