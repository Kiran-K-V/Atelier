import { useMemo } from 'react'
import type { Color, PieceInstance, PieceSymbol, PlayedMove } from '../../rules/types'
import { useGame } from '../../store/game'
import { pieceName } from '../a11y/describeMove'
import { glyph, PIECE_VALUE } from '../glyphs'
import { labelClass, sectionClass } from '../styles'

const COLORS: readonly Color[] = ['w', 'b']
const SIDE: Record<Color, string> = { w: 'White', b: 'Black' }

const material = (pieces: readonly PieceInstance[], color: Color): number =>
  pieces.reduce((sum, p) => (p.color === color ? sum + PIECE_VALUE[p.type] : sum), 0)

/** Pieces each side has taken, biggest first. Keyed by the capturer. */
function capturedBy(history: readonly PlayedMove[], color: Color): PieceSymbol[] {
  return history
    .flatMap((m) => (m.color === color && m.captured ? [m.captured.type] : []))
    .sort((a, b) => PIECE_VALUE[b] - PIECE_VALUE[a])
}

function CapturedRow({ color, taken, lead }: { color: Color; taken: readonly PieceSymbol[]; lead: number }) {
  const spoken =
    taken.length > 0
      ? `${SIDE[color]} has taken ${taken.map(pieceName).join(', ')}.`
      : `${SIDE[color]} has taken nothing.`
  const opponent: Color = color === 'w' ? 'b' : 'w'
  return (
    <div className="flex min-h-8 items-center gap-4">
      <dt className={`${labelClass} w-12 shrink-0`}>{SIDE[color]}</dt>
      <dd className="m-0 flex min-w-0 flex-1 items-center justify-between gap-3">
        <span className="sr-only">{spoken}</span>
        <span aria-hidden className="font-display text-xl leading-none tracking-wider text-text">
          {taken.length > 0 ? taken.map((t, i) => <span key={i}>{glyph(opponent, t)}</span>) : '–'}
        </span>
        {lead > 0 && (
          <span className="font-mono text-xs text-text">
            <span className="sr-only">leads by </span>+{lead}
          </span>
        )}
      </dd>
    </div>
  )
}

export function CapturedSummary() {
  const history = useGame((s) => s.history)
  const pieces = useGame((s) => s.pieces)
  const whiteLead = material(pieces, 'w') - material(pieces, 'b')
  const taken = useMemo(() => ({ w: capturedBy(history, 'w'), b: capturedBy(history, 'b') }), [history])

  return (
    <section aria-label="Captured pieces" className={sectionClass}>
      <dl className="m-0 flex flex-col gap-1">
        {COLORS.map((color) => (
          <CapturedRow
            key={color}
            color={color}
            taken={taken[color]}
            lead={color === 'w' ? Math.max(0, whiteLead) : Math.max(0, -whiteLead)}
          />
        ))}
      </dl>
    </section>
  )
}
