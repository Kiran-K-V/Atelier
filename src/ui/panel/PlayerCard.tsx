import { useMemo } from 'react'
import type { Color } from '../../rules/types'
import { useGame } from '../../store/game'
import { colorName, pieceName } from '../a11y/describeMove'
import { glyph } from '../glyphs'
import { CapturedPieces } from './CapturedPieces'
import { levelName } from './levels'
import { materialFromHistory } from './material'

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w')

/** Three dots that pulse in turn. Static when motion is reduced (ui.css stops the keyframes). */
function ThinkingDots() {
  return (
    <span aria-hidden className="thinking-dots inline-flex gap-0.5">
      <span />
      <span />
      <span />
    </span>
  )
}

/** One side of the table: a king tile in the side's colour, who it is, and what it has taken. */
export function PlayerCard({ color }: { color: Color }) {
  const history = useGame((s) => s.history)
  const playerColor = useGame((s) => s.playerColor)
  const difficulty = useGame((s) => s.difficulty)
  const engine = useGame((s) => s.engine)
  const active = useGame((s) => s.turn === color && s.status.kind === 'playing')

  const { groups, lead } = useMemo(() => materialFromHistory(history), [history])[color]
  const isYou = color === playerColor
  const name = isYou ? 'You' : 'Stockfish'
  const thinking = !isYou && active && engine === 'thinking'
  const taken = groups.flatMap((g) => Array.from({ length: g.count }, () => pieceName(g.type)))
  const spoken = `${colorName(color)} has taken ${taken.length > 0 ? taken.join(', ') : 'nothing'}${lead > 0 ? `, leads by ${lead}` : ''}.`

  return (
    <section
      aria-label={`${name}, ${colorName(color)}`}
      className={`relative flex min-h-16 items-center gap-3 px-4 py-2.5 transition-colors duration-base ease-standard lg:px-5 ${active ? 'bg-surface2' : ''}`}
    >
      {/* Turn marker: an accent bar on the leading edge of the side to move. */}
      <span aria-hidden className={`absolute inset-y-3 left-1.5 w-[3px] rounded-full bg-accent transition-opacity duration-base ${active ? 'opacity-100' : 'opacity-0'}`} />
      {/* Outline king for White, solid king for Black: the usual chess convention, readable in either theme. */}
      <span
        aria-hidden
        className={`grid size-10 shrink-0 place-items-center rounded-sm border bg-surface3 text-[1.625rem] leading-none text-text transition-[border-color,box-shadow] duration-base ${active ? 'border-accent/60 shadow-glow' : 'border-line'}`}
      >
        {glyph(color, 'k')}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="m-0 flex min-w-0 items-center gap-2 text-[0.9375rem] font-medium leading-5 text-text">
          <span className="truncate">{name}</span>
          {!isYou && (
            <span className="shrink-0 rounded-xs border border-line px-1.5 text-[0.6875rem] font-medium leading-4 text-text-muted">{levelName(difficulty)}</span>
          )}
          {thinking && (
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-normal text-accent-strong">
              <ThinkingDots />
              Thinking
            </span>
          )}
          {active && !thinking && (
            <span aria-hidden className="shrink-0 text-xs font-normal text-text-muted">
              To move
            </span>
          )}
        </p>
        <div className="flex min-h-[1.125rem] min-w-0 items-center gap-2 text-xs text-text-muted">
          <span className="shrink-0">{colorName(color)}</span>
          <CapturedPieces groups={groups} color={other(color)} lead={lead} />
        </div>
      </div>
      <span className="sr-only">
        {active ? `${colorName(color)} to move. ` : ''}
        {spoken}
      </span>
    </section>
  )
}
