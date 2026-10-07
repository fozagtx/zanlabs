import { Avatar } from '@base-ui/react/avatar'
import { profile, projects } from '../data/profile'
import { ArrowRightIcon, ArrowUpRightIcon } from '../components/icons'
import { CopyEmail } from '../components/ui/CopyEmail'
import { LinkButton } from '../components/ui/Button'
import { formatMonth } from '../lib/format'
import styles from './Hero.module.css'

const recent = [...projects].sort((a, b) => b.shipped.localeCompare(a.shipped)).slice(0, 5)

export function Hero() {
  return (
    <section className={`container ${styles.Hero}`} id="top" aria-labelledby="hero-title">
      <div className={styles.Grid}>
        <div>
          <div className={styles.Identity}>
            <Avatar.Root className={styles.Avatar}>
              <Avatar.Image src={profile.avatar} alt="" className={styles.AvatarImage} />
              <Avatar.Fallback>{profile.name.slice(0, 2).toUpperCase()}</Avatar.Fallback>
            </Avatar.Root>
            <div className={styles.Who}>
              <span className={styles.Name}>{profile.name}</span>
              <span className={styles.Handle}>{profile.role}</span>
            </div>
            {profile.available && (
              <span className={styles.Status}>
                <span className={styles.Dot} aria-hidden="true" />
                Available for work
              </span>
            )}
          </div>

          <h1 className={styles.Title} id="hero-title">
            <Highlighted text={profile.headline} word={profile.highlight} className={styles.Accent} />
          </h1>
          <p className={styles.Intro}>{profile.intro}</p>

          <div className={styles.Actions}>
            <LinkButton href="#work" variant="primary">
              See the work
              <ArrowRightIcon />
            </LinkButton>
            <CopyEmail email={profile.email} />
          </div>

          <dl className={styles.Facts}>
            {profile.facts.map((fact) => (
              <div key={fact.label} className={styles.Fact}>
                <dt className={styles.FactLabel}>{fact.label}</dt>
                <dd className={styles.FactValue}>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className={styles.Log} aria-labelledby="log-title">
          <div className={styles.LogHead}>
            <span id="log-title">Recently shipped</span>
            <span aria-hidden="true">git log</span>
          </div>
          <ul className={styles.LogList}>
            {recent.map((project) => (
              <li key={project.name} className={styles.LogItem}>
                <a href={project.repo} target="_blank" rel="noreferrer" className={styles.LogLink}>
                  <span className={styles.LogDate}>{formatMonth(project.shipped)}</span>
                  <span>
                    <span className={styles.LogName}>{project.name}</span>
                    <span className={styles.LogSummary}>{project.summary}</span>
                  </span>
                  <ArrowUpRightIcon className={styles.LogArrow} />
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  )
}

function Highlighted({ text, word, className }: { text: string; word: string; className: string }) {
  const at = text.indexOf(word)
  if (at === -1) return text
  return (
    <>
      {text.slice(0, at)}
      <span className={className}>{word}</span>
      {text.slice(at + word.length)}
    </>
  )
}
