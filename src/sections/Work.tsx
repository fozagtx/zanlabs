import { Dialog } from '@base-ui/react/dialog'
import { Tabs } from '@base-ui/react/tabs'
import { categories, languageColors, projects, type Project } from '../data/profile'
import { ArrowRightIcon, ArrowUpRightIcon, CloseIcon } from '../components/icons'
import { LinkButton } from '../components/ui/Button'
import { buttonClass } from '../components/ui/buttonClass'
import { formatMonth } from '../lib/format'
import section from './Section.module.css'
import styles from './Work.module.css'

const projectDialog = Dialog.createHandle<Project>()

const categoryLabel = Object.fromEntries(categories.map((c) => [c.value, c.label]))

const sorted = [...projects].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))

function inCategory(value: string) {
  return value === 'all' ? sorted : sorted.filter((p) => p.category === value)
}

export function Work() {
  return (
    <section className={`container ${section.Section}`} id="work" aria-labelledby="work-title">
      <Tabs.Root defaultValue="all">
        <div className={section.Head}>
          <div>
            <span className={section.Eyebrow}>Selected work</span>
            <h2 className={section.Title} id="work-title">
              Things I’ve shipped
            </h2>
          </div>
          <Tabs.List className={styles.List} aria-label="Filter projects">
            {categories.map((c) => (
              <Tabs.Tab key={c.value} value={c.value} className={styles.Tab}>
                {c.label}
                <span className={styles.Count}>{inCategory(c.value).length}</span>
              </Tabs.Tab>
            ))}
            <Tabs.Indicator className={styles.Indicator} />
          </Tabs.List>
        </div>

        {categories.map((c) => (
          <Tabs.Panel key={c.value} value={c.value} className={styles.Panel}>
            <ul className={styles.Grid}>
              {inCategory(c.value).map((project) => (
                <li key={project.name}>
                  <ProjectCard project={project} />
                </li>
              ))}
            </ul>
          </Tabs.Panel>
        ))}
      </Tabs.Root>

      <ProjectDialog />
    </section>
  )
}

function Language({ name }: { name: string }) {
  return (
    <span className={styles.Language}>
      <span
        className={styles.LangDot}
        style={{ backgroundColor: languageColors[name] ?? 'var(--color-muted)' }}
        aria-hidden="true"
      />
      {name}
    </span>
  )
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <article className={styles.Card}>
      <div className={styles.Meta}>
        <span>{categoryLabel[project.category]}</span>
        <Language name={project.language} />
      </div>
      <h3 className={styles.CardTitle}>
        <Dialog.Trigger handle={projectDialog} payload={project} className={styles.Trigger}>
          {project.name}
        </Dialog.Trigger>
      </h3>
      <p className={styles.Summary}>{project.summary}</p>
      <ul className={styles.Tags} aria-label="Tags">
        {project.tags.slice(0, 3).map((tag) => (
          <li key={tag} className={styles.Tag}>
            {tag}
          </li>
        ))}
      </ul>
      <div className={styles.Foot}>
        {project.featured ? (
          <span className={styles.Featured}>Featured</span>
        ) : (
          <span className={styles.Date}>{formatMonth(project.shipped)}</span>
        )}
        <span className={styles.More} aria-hidden="true">
          Details
          <ArrowRightIcon />
        </span>
      </div>
    </article>
  )
}

function ProjectDialog() {
  return (
    <Dialog.Root handle={projectDialog}>
      {({ payload: project }) => (
        <Dialog.Portal>
          <Dialog.Backdrop className={styles.Backdrop} />
          <Dialog.Popup className={styles.Popup}>
            {project && (
              <>
                <div className={styles.DialogTop}>
                  <span className={styles.Date}>
                    {categoryLabel[project.category]} · {formatMonth(project.shipped)}
                  </span>
                  <Dialog.Close
                    className={buttonClass({ variant: 'ghost', size: 'icon' })}
                    aria-label="Close"
                  >
                    <CloseIcon />
                  </Dialog.Close>
                </div>

                <Dialog.Title className={styles.DialogTitle}>{project.name}</Dialog.Title>
                <Dialog.Description className={styles.DialogDescription}>
                  {project.summary}
                </Dialog.Description>

                {project.highlights && project.highlights.length > 0 && (
                  <ul className={styles.Highlights}>
                    {project.highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}

                <dl className={styles.Details}>
                  <div className={styles.Detail}>
                    <dt>Language</dt>
                    <dd>
                      <Language name={project.language} />
                    </dd>
                  </div>
                  <div className={styles.Detail}>
                    <dt>Started</dt>
                    <dd>{formatMonth(project.shipped)}</dd>
                  </div>
                  <div className={`${styles.Detail} ${styles.DetailWide}`}>
                    <dt>Stack & topics</dt>
                    <dd>
                      <ul className={`${styles.Tags} ${styles.DialogTags}`}>
                        {project.tags.map((tag) => (
                          <li key={tag} className={styles.Tag}>
                            {tag}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                </dl>

                <div className={styles.DialogActions}>
                  <Dialog.Close className={buttonClass()}>Close</Dialog.Close>
                  <LinkButton href={project.repo} target="_blank" rel="noreferrer" variant="primary">
                    View on GitHub
                    <ArrowUpRightIcon />
                  </LinkButton>
                </div>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  )
}
