import { useMemo } from 'react'
import type { Color, PieceInstance, PieceSymbol, PlayedMove } from '../../rules/types'
import { useGame } from '../../store/game'
import { colorName, pieceName } from '../a11y/describeMove'
import { glyph, PIECE_VALUE } from '../glyphs'
import { levelName } from './levels'

const material = (pieces: readonly PieceInstance[], color: Color): number =>
  pieces.reduce((sum, p) => (p.color === color ? sum + PIECE_VALUE[p.type] : sum), 0)

/** Pieces `color` has taken, biggest first. */
function capturedBy(history: readonly PlayedMove[], color: Color): PieceSymbol[] {
  return history
    .flatMap((m) => (m.color === color && m.captured ? [m.captured.type] : []))
    .sort((a, b) => PIECE_VALUE[b] - PIECE_VALUE[a])
}

/** One side of the table: who it is, whose turn it is, and what it has taken. */
export function PlayerCard({ color }: { color: Color }) {
  const history = useGame((s) => s.history)
  const pieces = useGame((s) => s.pieces)
  const playerColor = useGame((s) => s.playerColor)
  const difficulty = useGame((s) => s.difficulty)
  const active = useGame((s) => s.turn === color && s.status.kind === 'playing')

  const taken = useMemo(() => capturedBy(history, color), [history, color])
  const lead = material(pieces, color) - material(pieces, color === 'w' ? 'b' : 'w')
  const opponent: Color = color === 'w' ? 'b' : 'w'
  const name = color === playerColor ? 'You' : `Stockfish · ${levelName(difficulty)}`
  const spoken =
    taken.length > 0 ? `${colorName(color)} has taken ${taken.map(pieceName).join(', ')}.` : `${colorName(color)} has taken nothing.`

  return (
    <section aria-label={`${name}, ${colorName(color)}`} className="flex min-h-14 items-center gap-3 border-t border-line px-4 lg:px-6">
      <span
        aria-hidden
        className={`size-2.5 shrink-0 rounded-full border ${color === 'w' ? 'bg-text' : 'bg-bg'} ${active ? 'border-accent-strong shadow-glow' : 'border-line-strong'}`}
      />
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-sm text-text">{name}</p>
        <p className="m-0 text-xs text-text-muted">
          {colorName(color)}
          {active && <span className="sr-only"> to move</span>}
        </p>
      </div>
      <span className="sr-only">{spoken}</span>
      <span aria-hidden className="font-display text-lg leading-none tracking-wide text-text">
        {taken.map((t, i) => (
          <span key={i}>{glyph(opponent, t)}</span>
        ))}
      </span>
      {lead > 0 && (
        <span className="font-mono text-xs text-text-muted">
          <span className="sr-only">leads by </span>+{lead}
        </span>
      )}
    </section>
  )
}
