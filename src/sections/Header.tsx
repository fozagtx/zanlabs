import { useEffect, useState } from 'react'
import { profile } from '../data/profile'
import { GitHubIcon } from '../components/icons'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import { buttonClass } from '../components/ui/buttonClass'
import { Hint } from '../components/ui/Hint'
import styles from './Header.module.css'

const links = [
  { href: '#work', label: 'Work' },
  { href: '#about', label: 'About' },
  { href: '#contact', label: 'Contact' },
]

export function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={styles.Header} data-scrolled={scrolled || undefined}>
      <div className={`container ${styles.Inner}`}>
        <a href="#top" className={styles.Brand}>
          <span className={styles.Mark} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2.5 2.5h9l-9 9h9" strokeLinecap="square" />
            </svg>
          </span>
          {profile.brand}
        </a>

        <nav className={styles.Nav} aria-label="Main">
          {links.map((link) => (
            <a key={link.href} href={link.href} className={styles.NavLink}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className={styles.Actions}>
          <Hint label={`@${profile.handle} on GitHub`}>
            <a
              href={profile.github}
              target="_blank"
              rel="noreferrer"
              className={buttonClass({ variant: 'ghost', size: 'icon' })}
              aria-label="GitHub profile"
            >
              <GitHubIcon />
            </a>
          </Hint>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  )
}
