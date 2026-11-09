import { useEffect, useMemo, useRef } from 'react'
import { TACTIC_NAME } from '../../rules/tacticNames'
import type { PlayedMove } from '../../rules/types'
import { useGame } from '../../store/game'
import { useSettings } from '../../store/settings'

interface Pair {
  readonly number: number
  readonly white: PlayedMove
  readonly black: PlayedMove | undefined
}

function pairUp(history: readonly PlayedMove[]): Pair[] {
  const pairs: Pair[] = []
  for (let i = 0; i < history.length; i += 2) {
    const white = history[i]
    if (white) pairs.push({ number: i / 2 + 1, white, black: history[i + 1] })
  }
  return pairs
}

function MoveCell({ move, current }: { move: PlayedMove | undefined; current: boolean }) {
  if (!move) return <span />
  const primary = move.tactics[0]
  return (
    <span
      aria-current={current ? 'step' : undefined}
      title={primary ? move.tactics.map((t) => TACTIC_NAME[t.kind]).join(', ') : undefined}
      className={`flex min-w-16 max-w-full items-baseline gap-1.5 justify-self-start rounded-xs px-2 py-1 ${current ? 'bg-surface3 text-text shadow-[inset_2px_0_0_var(--color-accent)]' : 'text-text'}`}
    >
      <span className="shrink-0">{move.san}</span>
      {primary && <span className="min-w-0 truncate font-mono text-[0.625rem] uppercase tracking-[0.08em] text-accent-strong">{TACTIC_NAME[primary.kind]}</span>}
    </span>
  )
}

export function MoveList() {
  const history = useGame((s) => s.history)
  const reduced = useSettings((s) => s.reducedMotion)
  const scroller = useRef<HTMLDivElement>(null)
  const pairs = useMemo(() => pairUp(history), [history])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduced ? 'auto' : 'smooth' })
  }, [history.length, reduced])

  return (
    <section aria-label="Moves" className="flex min-h-48 flex-1 flex-col border-t border-line">
      <h2 className="sr-only">Moves</h2>
      {/* Absolute inner scroller: the list scrolls on its own and never stretches the panel. */}
      <div className="relative flex-1">
        <div ref={scroller} tabIndex={0} aria-label="Move list" role="region" className="atelier-scroll absolute inset-0 overflow-y-auto px-2 py-3 lg:px-4">
          {pairs.length === 0 ? (
            <p className="m-0 grid h-full place-items-center text-sm text-text-muted">White opens.</p>
          ) : (
            <ol className="m-0 list-none p-0 font-mono text-sm">
              {pairs.map((pair, index) => {
                const lastPair = index === pairs.length - 1
                return (
                  <li key={pair.number} className="grid grid-cols-[2.5rem_1fr_1fr] items-center py-0.5">
                    <span className="pl-2 text-text-muted">{pair.number}.</span>
                    <MoveCell move={pair.white} current={lastPair && !pair.black} />
                    <MoveCell move={pair.black} current={lastPair && !!pair.black} />
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}
