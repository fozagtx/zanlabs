import { useEffect, useState } from 'react'

export type Mode = 'system' | 'light' | 'dark'
export type Style = 'base' | 'soft' | 'signal'

export const styles: { value: Style; label: string; note: string }[] = [
  { value: 'base', label: 'Base', note: 'Sharp, ink outlines' },
  { value: 'soft', label: 'Soft', note: 'Warm, rounded, serif' },
  { value: 'signal', label: 'Signal', note: 'Mono, acid accent' },
]

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). The theme still applies.
  }
}

/** Reads the initial values from <html>, where index.html already applied any saved choice. */
export function useTheme() {
  const root = document.documentElement
  const [mode, setMode] = useState<Mode>(() => (root.dataset.theme as Mode | undefined) ?? 'system')
  const [style, setStyle] = useState<Style>(() => (root.dataset.style as Style | undefined) ?? 'base')

  useEffect(() => {
    if (mode === 'system') delete root.dataset.theme
    else root.dataset.theme = mode
    save('zl-mode', mode)
  }, [mode, root])

  useEffect(() => {
    root.dataset.style = style
    save('zl-style', style)
  }, [style, root])

  return { mode, setMode, style, setStyle }
}
