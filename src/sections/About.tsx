import { Accordion } from '@base-ui/react/accordion'
import { profile, services } from '../data/profile'
import { PlusIcon } from '../components/icons'
import section from './Section.module.css'
import styles from './About.module.css'

export function About() {
  return (
    <section className={`container ${section.Section}`} id="about" aria-labelledby="about-title">
      <div className={styles.Grid}>
        <div>
          <span className={section.Eyebrow}>About</span>
          <h2 className={section.Title} id="about-title">
            Close to the problem, end to end.
          </h2>
          <div className={styles.Copy}>
            {profile.about.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <span className={styles.StackLabel} id="stack-label">
            Tools I reach for
          </span>
          <ul className={styles.Stack} aria-labelledby="stack-label">
            {profile.stack.map((item) => (
              <li key={item} className={styles.Chip}>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <Accordion.Root className={styles.Accordion} defaultValue={[services[0].title]} hiddenUntilFound>
          {services.map((service, index) => (
            <Accordion.Item key={service.title} value={service.title} className={styles.Item}>
              <Accordion.Header className={styles.Header}>
                <Accordion.Trigger className={styles.Trigger}>
                  <span className={styles.Index}>{String(index + 1).padStart(2, '0')}</span>
                  {service.title}
                  <PlusIcon className={styles.Icon} />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel className={styles.Panel}>
                <p className={styles.PanelBody}>{service.body}</p>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  )
}
