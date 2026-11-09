import { motion, MotionConfig } from 'motion/react'
import { useMemo } from 'react'
import { Link } from 'wouter'
import { curriculum } from '../../academy/curriculum'
import { nextSkill, skillState } from '../../academy/state'
import type { Skill, SkillId, SkillState } from '../../academy/types'
import { useProgress } from '../../store/progress'
import { useSettings } from '../../store/settings'
import { bezier, sec } from '../motionTokens'
import { labelClass } from '../styles'
import { LevelProgress, SkillMap, type StateMap } from './SkillMap'
import { SkillMedallion } from './SkillMedallion'
import { STATE_LABEL } from './skillMapLayout'

/** Academy landing page: where you are, what to do next, and the whole map. */
export function AcademyHome() {
  const progress = useProgress((s) => s.skills)
  const reduced = useSettings((s) => s.reducedMotion)

  const states = useMemo(
    () => Object.fromEntries(curriculum.skills.map((s) => [s.id, skillState(s, progress)])) as Record<SkillId, SkillState>,
    [progress],
  )
  const next = useMemo(() => nextSkill(curriculum, progress), [progress])
  const mastered = curriculum.skills.filter((s) => states[s.id] === 'mastered').length
  const total = curriculum.skills.length

  const enter = (delay: number) => ({
    initial: reduced ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: sec('slow'), ease: bezier('enter'), delay },
  })

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <section aria-labelledby="academy-title" className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-end lg:gap-16">
        <motion.div {...enter(0)}>
          <p className={`${labelClass} m-0`}>The Atelier school</p>
          <h1 id="academy-title" className="atelier-wordmark m-0 mt-3 text-5xl font-normal leading-[0.95] text-text lg:text-[5.25rem]">
            Academy
          </h1>
          <p className="m-0 mt-5 max-w-[34ch] text-lg leading-relaxed text-text-muted">
            {total} short lessons, from how the pieces move to winning combinations. Open any of them; the map suggests what comes next.
          </p>
          <Overall mastered={mastered} total={total} states={states} />
        </motion.div>
        <motion.div {...enter(0.08)}>
          <ContinueCard skill={next} state={next ? states[next.id] : undefined} started={Object.keys(progress).length > 0} reduced={reduced} />
        </motion.div>
      </section>

      <div className="mt-16 lg:mt-20">
        <div className="mb-2 flex items-baseline justify-between gap-4 border-b border-line-strong pb-3">
          <h2 className="atelier-display m-0 text-2xl font-normal text-text">The map</h2>
          <Legend />
        </div>
        <SkillMap curriculum={curriculum} states={states as StateMap} reduced={reduced} />
      </div>
    </MotionConfig>
  )
}

function Overall({ mastered, total, states }: { mastered: number; total: number; states: Record<SkillId, SkillState> }) {
  return (
    <div className="mt-8 max-w-xl">
      <p className="m-0 flex items-baseline gap-2">
        <span className="atelier-display text-3xl leading-none text-text">{mastered}</span>
        <span className="font-mono text-sm text-text-muted">/ {total} mastered</span>
      </p>
      <ul aria-label="Progress by level" className="m-0 mt-4 grid list-none grid-cols-3 gap-x-4 gap-y-3 p-0 sm:grid-cols-6">
        {curriculum.levels.map((level) => {
          const skills = curriculum.skills.filter((s) => s.level === level.id)
          const done = skills.filter((s) => states[s.id] === 'mastered').length
          return (
            <li key={level.id} aria-label={`${level.title}: ${done} of ${skills.length} mastered`}>
              <LevelProgress mastered={done} total={skills.length} />
              <span aria-hidden className="mt-1.5 block truncate text-[0.6875rem] text-text-muted">
                {level.title}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ContinueCard({ skill, state, started, reduced }: { skill?: Skill; state?: SkillState; started: boolean; reduced: boolean }) {
  if (!skill || !state) {
    return (
      <div className="glass rounded-md border border-line-strong bg-surface p-6">
        <p className={`${labelClass} m-0`}>Complete</p>
        <p className="atelier-display m-0 mt-3 text-2xl text-text">Every skill is mastered.</p>
        <p className="m-0 mt-2 text-sm text-text-muted">Revisit any lesson on the map, or test yourself in a game.</p>
      </div>
    )
  }
  const level = curriculum.levels.find((l) => l.id === skill.level)!
  const eyebrow = state === 'inProgress' ? 'Continue' : started ? 'Up next' : 'Start here'
  const cta = state === 'inProgress' ? 'Resume lesson' : 'Begin lesson'
  return (
    <Link
      href={`/academy/${skill.id}`}
      aria-label={`${eyebrow}: ${skill.title}, ${level.title}, ${skill.minutes} minutes, ${STATE_LABEL[state].toLowerCase()}`}
      className="glass group relative block overflow-hidden rounded-md border border-line-strong bg-surface p-6 no-underline shadow-md outline-none transition-shadow duration-base ease-standard hover:shadow-glow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
    >
      {/* Brass hairline, brightest at the centre, like a lit edge. */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-strong to-transparent" />
      <div className="flex items-center justify-between">
        <p className={`${labelClass} m-0 text-accent-strong`}>{eyebrow}</p>
        <p className="m-0 font-mono text-xs text-text-muted">{skill.minutes} min</p>
      </div>
      <div className="mt-5 flex items-start gap-5">
        <SkillMedallion state={state} ordinal={curriculum.skills.indexOf(skill) + 1} size={60} tactic={skill.tactic} reduced={reduced} />
        <div className="min-w-0">
          <p className="atelier-display m-0 text-2xl leading-tight text-text">{skill.title}</p>
          <p className="m-0 mt-1 text-sm text-text-muted">{level.title}</p>
        </div>
      </div>
      <p className="m-0 mt-5 text-sm leading-relaxed text-text-muted">{skill.summary}</p>
      <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-text-muted">{STATE_LABEL[state]}</span>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-accent-strong">
          {cta}
          <span aria-hidden className="transition-transform duration-fast ease-standard group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </Link>
  )
}

const LEGEND: readonly SkillState[] = ['recommended', 'inProgress', 'mastered', 'later']

function Legend() {
  return (
    <ul aria-label="Map key" className="m-0 hidden list-none items-center gap-5 p-0 md:flex">
      {LEGEND.map((s) => (
        <li key={s} className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-text-muted">
          <SkillMedallion state={s} ordinal={0} size={16} reduced />
          {STATE_LABEL[s]}
        </li>
      ))}
    </ul>
  )
}
