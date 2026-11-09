import type { Color, PieceSymbol, PlayedMove } from '../../rules/types'
import { PIECE_VALUE } from '../glyphs'

/** Display order for captured pieces: cheapest first, as chess.com and lichess show them. */
const ORDER: readonly PieceSymbol[] = ['p', 'n', 'b', 'r', 'q']

export interface CapturedGroup {
  readonly type: PieceSymbol
  readonly count: number
}

export interface SideMaterial {
  /** Enemy pieces this side has taken, grouped by type, cheapest first. Empty groups are left out. */
  readonly groups: readonly CapturedGroup[]
  /** Material lead in points (P1 N3 B3 R5 Q9). Zero unless this side is ahead. */
  readonly lead: number
}

/**
 * What each side has taken and who is ahead, read from the move history alone.
 * A promotion counts as a gain of (new piece - pawn), so the lead matches the board.
 */
export function materialFromHistory(history: readonly PlayedMove[]): Record<Color, SideMaterial> {
  const counts: Record<Color, Record<PieceSymbol, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  }
  const points: Record<Color, number> = { w: 0, b: 0 }
  for (const move of history) {
    if (move.captured) {
      counts[move.color][move.captured.type]++
      points[move.color] += PIECE_VALUE[move.captured.type]
    }
    if (move.promotion) points[move.color] += PIECE_VALUE[move.promotion] - PIECE_VALUE.p
  }
  const diff = points.w - points.b
  const side = (color: Color, lead: number): SideMaterial => ({
    groups: ORDER.filter((type) => counts[color][type] > 0).map((type) => ({ type, count: counts[color][type] })),
    lead: Math.max(lead, 0),
  })
  return { w: side('w', diff), b: side('b', -diff) }
}
