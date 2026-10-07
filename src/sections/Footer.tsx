import { profile } from '../data/profile'
import styles from './Footer.module.css'

const year = new Date().getFullYear()

export function Footer() {
  return (
    <footer className={styles.Footer}>
      <div className={`container ${styles.Inner}`}>
        <span>
          © {year} {profile.name} · {profile.brand}
        </span>
        <span>
          Built with <a href="https://base-ui.com" target="_blank" rel="noreferrer">Base UI</a>,
          themed with design tokens.
        </span>
      </div>
    </footer>
  )
}
