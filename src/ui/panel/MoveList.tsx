import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'wouter'
import { curriculum } from '../../academy/curriculum'
import { TACTIC_NAME } from '../../rules/tacticNames'
import type { PlayedMove, TacticKind } from '../../rules/types'
import { useGame } from '../../store/game'
import { useSettings } from '../../store/settings'
import { moveRows } from './moveRows'

const TAG_CLASS =
  'min-w-0 truncate rounded-xs bg-accent/10 px-1 text-[0.625rem] font-semibold uppercase leading-4 tracking-[0.06em] text-accent-strong'

/** The tactic name; a link to its Academy skill when the curriculum teaches it. */
function TacticTag({ kind }: { kind: TacticKind }) {
  const skill = curriculum.skills.find((s) => s.tactic === kind)
  if (!skill) return <span className={TAG_CLASS}>{TACTIC_NAME[kind]}</span>
  return (
    <Link href={`/academy/${skill.id}`} title={`Learn: ${skill.title}`} className={`${TAG_CLASS} no-underline hover:underline focus-visible:underline`}>
      {TACTIC_NAME[kind]}
    </Link>
  )
}

function MoveCell({ move, current }: { move: PlayedMove | undefined; current: boolean }) {
  if (!move) return <span className="px-2 text-text-faint">{'…'}</span>
  const primary = move.tactics[0]
  return (
    <span
      aria-current={current ? 'step' : undefined}
      title={primary ? move.tactics.map((t) => TACTIC_NAME[t.kind]).join(', ') : undefined}
      className={`flex h-7 min-w-0 shrink-0 items-center gap-1.5 rounded-xs px-2 transition-colors duration-fast ${current ? 'bg-accent/15 font-semibold text-text shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-accent)_35%,transparent)]' : 'text-text'}`}
    >
      <span className="shrink-0">{move.san}</span>
      {primary && <TacticTag kind={primary.kind} />}
    </span>
  )
}

/**
 * The game score. Desktop: a numbered table, white and black columns, scrolling down.
 * Phone: the same rows laid end to end in one strip, scrolling sideways, like lichess mobile.
 * Either way the newest move is highlighted and kept in view.
 */
export function MoveList() {
  const history = useGame((s) => s.history)
  const reduced = useSettings((s) => s.reducedMotion)
  const scroller = useRef<HTMLDivElement>(null)
  const rows = useMemo(() => moveRows(history), [history])
  const last = history[history.length - 1]

  useEffect(() => {
    const el = scroller.current
    el?.scrollTo({ top: el.scrollHeight, left: el.scrollWidth, behavior: reduced ? 'auto' : 'smooth' })
  }, [history.length, reduced])

  return (
    <section aria-label="Moves" className="flex shrink-0 flex-col border-y border-line lg:min-h-40 lg:flex-1">
      <h2 className="sr-only">Moves</h2>
      {/* Absolute inner scroller on desktop: the list scrolls on its own and never stretches the panel. */}
      <div className="relative lg:flex-1">
        <div
          ref={scroller}
          tabIndex={0}
          aria-label="Move list"
          role="region"
          className="atelier-scroll overflow-x-auto overflow-y-hidden px-2 py-2 lg:absolute lg:inset-0 lg:overflow-y-auto lg:overflow-x-hidden lg:px-3 lg:py-3"
        >
          {rows.length === 0 ? (
            <p className="m-0 flex h-7 items-center gap-3 px-2 text-sm text-text-muted lg:h-auto lg:flex-col lg:items-start lg:gap-0.5 lg:py-1">
              <span className="text-text">No moves yet</span>
              <span>The score appears here as you play.</span>
            </p>
          ) : (
            <ol className="m-0 flex list-none gap-1 p-0 text-sm tabular-nums lg:block">
              {rows.map((row) => (
                <li
                  key={row.number}
                  className="flex shrink-0 items-center lg:grid lg:grid-cols-[2.25rem_1fr_1fr] lg:gap-1 lg:rounded-xs lg:py-px lg:even:bg-surface2/60"
                >
                  <span className="pl-1 pr-0.5 text-text-muted lg:pl-2 lg:pr-0">{row.number}.</span>
                  <MoveCell move={row.white} current={row.white === last} />
                  {row.black && <MoveCell move={row.black} current={row.black === last} />}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}
