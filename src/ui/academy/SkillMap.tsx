import { motion } from 'motion/react'
import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from 'wouter'
import type { Curriculum, Level, Skill, SkillId, SkillState } from '../../academy/types'
import { bezier, sec } from '../motionTokens'
import { labelClass } from '../styles'
import { SkillMedallion } from './SkillMedallion'
import { ancestors, STATE_LABEL, dependents, layoutSkillMap, NODE_R, type MapLayout } from './skillMapLayout'

export type StateMap = Readonly<Record<SkillId, SkillState>>

interface SkillMapProps {
  readonly curriculum: Curriculum
  readonly states: StateMap
  readonly reduced: boolean
}

const WIDE = '(min-width: 1024px)'
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(WIDE)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const useWide = () => useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches)

const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']

const ariaFor = (skill: Skill, state: SkillState) => `${skill.title}, ${STATE_LABEL[state].toLowerCase()}, ${skill.minutes} minutes`

/** The illustrated map on wide screens; a guided list of bands on narrow ones. */
export function SkillMap(props: SkillMapProps) {
  return useWide() ? <WideMap {...props} /> : <ListMap {...props} />
}

function levelCounts(curriculum: Curriculum, level: Level, states: StateMap) {
  const skills = curriculum.skills.filter((s) => s.level === level.id)
  return { total: skills.length, mastered: skills.filter((s) => states[s.id] === 'mastered').length }
}

export function LevelProgress({ mastered, total, className = '' }: { mastered: number; total: number; className?: string }) {
  return (
    <span aria-hidden className={`relative block h-[3px] overflow-hidden rounded-pill bg-line ${className}`}>
      <span className="absolute inset-y-0 left-0 rounded-pill bg-accent-strong" style={{ width: `${(mastered / total) * 100}%` }} />
    </span>
  )
}

function BandHeading({ level, index, curriculum, states, compact }: { level: Level; index: number; curriculum: Curriculum; states: StateMap; compact?: boolean }) {
  const { mastered, total } = levelCounts(curriculum, level, states)
  return (
    <div className={compact ? '' : 'pr-8'}>
      <p className={`${labelClass} m-0 flex items-baseline gap-2`}>
        <span className="font-display text-sm normal-case tracking-normal text-accent-strong">{roman[index]}</span>
        <span>Level {String(index + 1).padStart(2, '0')}</span>
      </p>
      <h2 className="atelier-display m-0 mt-2 text-xl font-normal leading-tight text-text">{level.title}</h2>
      <p className="m-0 mt-2 text-sm leading-relaxed text-text-muted">{level.summary}</p>
      <div className="mt-4 flex items-center gap-3">
        <LevelProgress mastered={mastered} total={total} className="flex-1" />
        <span className="font-mono text-xs text-text-muted">
          {mastered}/{total}
          <span className="sr-only"> skills mastered</span>
        </span>
      </div>
    </div>
  )
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    setWidth(Math.round(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

function WideMap({ curriculum, states, reduced }: SkillMapProps) {
  const [ref, width] = useWidth()
  const layout = useMemo<MapLayout | null>(() => (width > 0 ? layoutSkillMap(curriculum, width) : null), [curriculum, width])
  const [focus, setFocus] = useState<SkillId | null>(null)

  const chain = useMemo(() => {
    if (!focus) return null
    const up = ancestors(curriculum, focus).add(focus)
    const down = dependents(curriculum, focus).add(focus)
    return { up, down, all: new Set([...up, ...down]) }
  }, [curriculum, focus])

  const height = layout?.height ?? 0

  return (
    <div className="relative flex" style={{ minHeight: height }}>
      {/* Band dividers run under both columns. */}
      {layout?.bands.map((b, i) => (
        <div key={b.level.id} aria-hidden className={`absolute inset-x-0 ${i ? 'border-t border-line' : ''}`} style={{ top: b.y, height: b.height }} />
      ))}

      <div className="relative w-[248px] shrink-0">
        {layout?.bands.map((b, i) => (
          <motion.section
            key={b.level.id}
            aria-labelledby={`band-${b.level.id}`}
            className="absolute inset-x-0 pt-12"
            style={{ top: b.y }}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: sec('slow'), ease: bezier('enter'), delay: i * 0.07 }}
          >
            <span id={`band-${b.level.id}`} className="sr-only">
              {b.level.title}
            </span>
            <BandHeading level={b.level} index={i} curriculum={curriculum} states={states} />
          </motion.section>
        ))}
      </div>

      <div ref={ref} className="relative min-w-0 flex-1" style={{ height }}>
        {layout && (
          <>
            <svg aria-hidden width={layout.width} height={layout.height} className="absolute inset-0 overflow-visible" fill="none">
              {layout.edges.map((e, i) => {
                const lit = chain && ((chain.up.has(e.from) && chain.up.has(e.to)) || (chain.down.has(e.from) && chain.down.has(e.to)))
                const walked = states[e.from] === 'mastered'
                const cls = lit ? 'stroke-accent-strong' : walked ? 'stroke-accent' : 'stroke-text-faint'
                return (
                  <motion.path
                    key={`${e.from}>${e.to}`}
                    d={e.d}
                    className={`${cls} transition-[stroke,opacity,stroke-width] duration-base ease-standard`}
                    strokeWidth={lit ? 2 : walked ? 1.5 : 1.25}
                    strokeLinecap="round"
                    style={{ opacity: chain && !lit ? 0.12 : lit ? 1 : walked ? 0.85 : 0.4 }}
                    initial={reduced ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: sec('deliberate'), ease: bezier('enter'), delay: 0.35 + i * 0.015 }}
                  />
                )
              })}
            </svg>

            <ol className="m-0 list-none p-0">
              {layout.nodes.map((n) => {
                const state = states[n.skill.id]
                const dim = chain && !chain.all.has(n.skill.id)
                return (
                  <motion.li
                    key={n.skill.id}
                    className="absolute"
                    style={{ left: n.x - layout.colW / 2, top: n.y - NODE_R, width: layout.colW }}
                    initial={reduced ? false : { opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: sec('slow'), ease: bezier('enter'), delay: 0.12 + n.index * 0.022 }}
                  >
                    <Link
                      href={`/academy/${n.skill.id}`}
                      aria-label={ariaFor(n.skill, state)}
                      onPointerEnter={() => setFocus(n.skill.id)}
                      onPointerLeave={() => setFocus(null)}
                      onFocus={() => setFocus(n.skill.id)}
                      onBlur={() => setFocus(null)}
                      className={`group flex flex-col items-center px-2 text-center no-underline outline-none transition-opacity duration-base ease-standard ${dim ? 'opacity-35' : ''}`}
                    >
                      <span className="rounded-full outline-offset-[6px] transition-transform duration-fast ease-standard group-hover:-translate-y-0.5 group-focus-visible:outline-2 group-focus-visible:outline-focus">
                        <SkillMedallion state={state} ordinal={n.index + 1} size={NODE_R * 2} tactic={n.skill.tactic} reduced={reduced} />
                      </span>
                      <span className="mt-2.5 rounded-xs bg-bg/85 px-1.5 py-0.5 text-[0.8125rem] leading-snug text-text group-hover:text-accent-strong">
                        {n.skill.title}
                      </span>
                      <NodeMeta skill={n.skill} state={state} />
                    </Link>
                  </motion.li>
                )
              })}
            </ol>
          </>
        )}
      </div>
    </div>
  )
}

function NodeMeta({ skill, state }: { skill: Skill; state: SkillState }) {
  const tone = state === 'later' ? 'text-text-muted' : 'text-accent-strong'
  return (
    <span className={`mt-0.5 rounded-xs bg-bg/85 px-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.12em] ${tone}`}>
      {state === 'later' ? `${skill.minutes} min` : state === 'recommended' ? `Next · ${skill.minutes} min` : STATE_LABEL[state]}
    </span>
  )
}

function ListMap({ curriculum, states, reduced }: SkillMapProps) {
  const titles = new Map(curriculum.skills.map((s) => [s.id, s.title]))
  return (
    <div className="flex flex-col gap-12 pt-6">
      {curriculum.levels.map((level, li) => {
        const skills = curriculum.skills.filter((s) => s.level === level.id)
        return (
          <motion.section
            key={level.id}
            aria-labelledby={`list-band-${level.id}`}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: sec('slow'), ease: bezier('enter'), delay: 0.1 + li * 0.06 }}
          >
            <span id={`list-band-${level.id}`} className="sr-only">
              {level.title}
            </span>
            <BandHeading level={level} index={li} curriculum={curriculum} states={states} compact />
            <ol className="relative m-0 mt-5 list-none p-0">
              {/* The path through the level: a hairline behind the seals. */}
              <span aria-hidden className="absolute bottom-6 left-[19px] top-6 w-px bg-line-strong" />
              {skills.map((skill) => {
                const state = states[skill.id]
                const index = curriculum.skills.indexOf(skill)
                const needs = skill.prerequisites.map((p) => titles.get(p)).filter(Boolean)
                return (
                  <li key={skill.id} className="relative">
                    <Link
                      href={`/academy/${skill.id}`}
                      aria-label={ariaFor(skill, state)}
                      className="group flex items-start gap-4 rounded-sm py-2.5 pr-2 no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      <span className="rounded-full bg-bg">
                        <SkillMedallion state={state} ordinal={index + 1} size={40} tactic={skill.tactic} reduced={reduced} />
                      </span>
                      <span className="min-w-0 flex-1 pt-0.5">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="text-base leading-snug text-text group-hover:text-accent-strong">{skill.title}</span>
                          <span className={`shrink-0 font-mono text-[0.6875rem] uppercase tracking-[0.12em] ${state === 'later' ? 'text-text-muted' : 'text-accent-strong'}`}>
                            {state === 'later' ? `${skill.minutes} min` : STATE_LABEL[state]}
                          </span>
                        </span>
                        {needs.length > 0 && (
                          <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">
                            <span className="font-mono uppercase tracking-[0.12em]">needs</span> {needs.join(', ')}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          </motion.section>
        )
      })}
    </div>
  )
}
