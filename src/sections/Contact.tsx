import { profile } from '../data/profile'
import { ArrowUpRightIcon, GitHubIcon, MailIcon } from '../components/icons'
import { CopyEmail } from '../components/ui/CopyEmail'
import { LinkButton } from '../components/ui/Button'
import section from './Section.module.css'
import styles from './Contact.module.css'

export function Contact() {
  return (
    <section className={`container ${section.Section}`} id="contact" aria-labelledby="contact-title">
      <div className={`inverted ${styles.Card}`}>
        <div className={styles.Glow} aria-hidden="true" />
        <div>
          <h2 className={styles.Title} id="contact-title">
            Have something worth shipping?
          </h2>
          <p className={styles.Text}>
            I’m open to new work. Tell me what you’re building and where it’s stuck — I’ll reply
            with how I’d get it out the door. <span className={styles.Email}>{profile.email}</span>
          </p>
        </div>
        <div className={styles.Actions}>
          <LinkButton href={`mailto:${profile.email}`} variant="primary">
            <MailIcon />
            Email me
          </LinkButton>
          <CopyEmail email={profile.email} />
          <LinkButton href={profile.github} target="_blank" rel="noreferrer">
            <GitHubIcon />
            GitHub
            <ArrowUpRightIcon />
          </LinkButton>
        </div>
      </div>
    </section>
  )
}
