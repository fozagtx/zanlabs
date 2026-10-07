import { Popover } from '@base-ui/react/popover'
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { styles as themeStyles, useTheme, type Mode, type Style } from '../theme/useTheme'
import { MonitorIcon, MoonIcon, PaletteIcon, SunIcon } from './icons'
import { buttonClass } from './ui/buttonClass'
import css from './ThemeSwitcher.module.css'

const swatch: Record<Style, string> = {
  base: css.SwatchBase,
  soft: css.SwatchSoft,
  signal: css.SwatchSignal,
}

const modes: { value: Mode; label: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'Auto', Icon: MonitorIcon },
]

export function ThemeSwitcher() {
  const { mode, setMode, style, setStyle } = useTheme()

  return (
    <Popover.Root>
      <Popover.Trigger className={buttonClass({ size: 'sm' })}>
        <PaletteIcon />
        <span className={css.TriggerText}>Theme</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className={css.Positioner} side="bottom" align="end" sideOffset={8}>
          <Popover.Popup className={css.Popup}>
            <Popover.Title className={css.Title}>Make it yours</Popover.Title>
            <Popover.Description className={css.Description}>
              Every color, radius and typeface here is a theme token. Swap the style and the whole
              site follows.
            </Popover.Description>

            <span className={css.Label} id="style-label">
              Style
            </span>
            <ToggleGroup
              aria-labelledby="style-label"
              className={css.Group}
              value={[style]}
              onValueChange={(value) => value[0] && setStyle(value[0] as Style)}
            >
              {themeStyles.map((s) => (
                <Toggle key={s.value} value={s.value} className={css.Option}>
                  <span className={`${css.Swatch} ${swatch[s.value]}`} aria-hidden="true" />
                  {s.label}
                  <span className={css.Note}>{s.note}</span>
                </Toggle>
              ))}
            </ToggleGroup>

            <span className={css.Label} id="mode-label">
              Mode
            </span>
            <ToggleGroup
              aria-labelledby="mode-label"
              className={css.Group}
              value={[mode]}
              onValueChange={(value) => value[0] && setMode(value[0] as Mode)}
            >
              {modes.map(({ value, label, Icon }) => (
                <Toggle key={value} value={value} className={`${css.Option} ${css.ModeOption}`}>
                  <Icon />
                  {label}
                </Toggle>
              ))}
            </ToggleGroup>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
