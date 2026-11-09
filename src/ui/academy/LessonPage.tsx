import { Link } from 'wouter'
import { curriculum } from '../../academy/curriculum'
import { skillState } from '../../academy/state'
import type { Skill, SkillState } from '../../academy/types'
import { useProgress } from '../../store/progress'
import { Button } from '../Button'
import { NotFound } from '../NotFound'
import { labelClass } from '../styles'
import { useDocumentTitle } from '../useDocumentTitle'
import { AcademyLayout } from './AcademyLayout'

const STATE_LABEL: Record<SkillState, string> = {
  later: 'Later',
  recommended: 'Recommended',
  inProgress: 'In progress',
  mastered: 'Mastered',
}

const STEPS = [
  { name: 'Watch', detail: 'A worked example, move by move.' },
  { name: 'Try', detail: 'Guided practice. Hints on request.' },
  { name: 'Solve', detail: 'Independent puzzles.' },
  { name: 'Review', detail: 'Spaced recall, days later.' },
] as const

const linkClass = 'text-accent-strong underline-offset-4 hover:underline focus-visible:underline'

function SkillLink({ skill, children }: { skill: Skill; children?: React.ReactNode }) {
  return (
    <Link href={`/academy/${skill.id}`} className={linkClass}>
      {children ?? skill.title}
    </Link>
  )
}

export function LessonPage({ skillId }: { readonly skillId: string }) {
  const index = curriculum.skills.findIndex((s) => s.id === skillId)
  const skill = curriculum.skills[index]
  const progress = useProgress((s) => s.skills)
  const level = skill && curriculum.levels.find((l) => l.id === skill.level)
  useDocumentTitle(skill ? `${skill.title} · Academy · Atelier Chess` : 'Not found · Atelier Chess')

  if (!skill || !level) return <NotFound />
  const prev = curriculum.skills[index - 1]
  const next = curriculum.skills[index + 1]
  const prerequisites = skill.prerequisites.flatMap((id) => curriculum.skills.find((s) => s.id === id) ?? [])

  return (
    <AcademyLayout>
      <article className="mx-auto max-w-3xl">
        <nav aria-label="Breadcrumb" className={`${labelClass} flex flex-wrap gap-x-2`}>
          <Link href="/academy" className="hover:text-text hover:underline focus-visible:underline">Academy</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{level.title}</span>
        </nav>

        <h1 className="atelier-display m-0 mt-4 text-3xl font-light leading-tight text-text lg:text-5xl">{skill.title}</h1>
        <p className="m-0 mt-4 text-lg text-text-muted">{skill.summary}</p>
        <p className={`${labelClass} m-0 mt-4`}>About {skill.minutes} min · {STATE_LABEL[skillState(skill, progress)]}</p>

        <section aria-labelledby="objectives" className="mt-10">
          <h2 id="objectives" className={`${labelClass} m-0`}>You will be able to</h2>
          <ul className="m-0 mt-3 list-none p-0">
            {skill.objectives.map((o) => (
              <li key={o} className="flex gap-3 border-t border-line py-3 text-text">
                <span aria-hidden="true" className="text-accent">·</span>
                {o}
              </li>
            ))}
          </ul>
        </section>

        {prerequisites.length > 0 && (
          <section aria-labelledby="prereqs" className="mt-10">
            <h2 id="prereqs" className={`${labelClass} m-0`}>Before this</h2>
            <ul className="m-0 mt-3 list-none p-0">
              {prerequisites.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-4 border-t border-line py-3">
                  <SkillLink skill={p} />
                  <span className={labelClass}>{STATE_LABEL[skillState(p, progress)]}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="loop" className="mt-10">
          <h2 id="loop" className={`${labelClass} m-0`}>How the lesson works</h2>
          <ol className="m-0 mt-3 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.name} className="glass rounded-sm border border-line bg-surface p-4">
                <span className={labelClass}>Step {i + 1}</span>
                <p className="atelier-display m-0 mt-1 text-xl text-text">{step.name}</p>
                <p className="m-0 mt-2 text-sm text-text-muted">{step.detail}</p>
                <p className="m-0 mt-3 font-mono text-xs uppercase tracking-[0.08em] text-text-muted">Coming in Phase 5</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button variant="primary" disabled aria-describedby="start-reason">Start lesson</Button>
          <span id="start-reason" className="text-sm text-text-muted">Lessons open in the next update</span>
        </div>

        <nav aria-label="Skill order" className="mt-12 grid grid-cols-2 gap-4 border-t border-line pt-6">
          <div>
            {prev && (
              <>
                <span className={labelClass}>Previous</span>
                <p className="m-0 mt-1"><SkillLink skill={prev} /></p>
              </>
            )}
          </div>
          <div className="text-right">
            {next && (
              <>
                <span className={labelClass}>Next</span>
                <p className="m-0 mt-1"><SkillLink skill={next} /></p>
              </>
            )}
          </div>
        </nav>
      </article>
    </AcademyLayout>
  )
}
