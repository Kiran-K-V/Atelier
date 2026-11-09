import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from './types'

export const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 1000 }

export function opposite(color: Color): Color {
  return color === 'w' ? 'b' : 'w'
}

interface Capturer {
  readonly square: Square
  readonly type: PieceSymbol
}

function leastValuableAttacker(board: Chess, square: Square, side: Color): Capturer | undefined {
  let best: Capturer | undefined
  for (const from of board.attackers(square, side)) {
    const piece = board.get(from)
    if (piece && (!best || PIECE_VALUE[piece.type] < PIECE_VALUE[best.type])) {
      best = { square: from, type: piece.type }
    }
  }
  // Only the king is left to capture: legal solely when nothing recaptures.
  if (best?.type === 'k' && board.attackers(square, opposite(side)).length > 0) return undefined
  return best
}

/**
 * Static exchange evaluation: what `firstCapturer` nets by starting a capture sequence
 * on `square` (never negative, they may decline). Pins are ignored. Capturers leave the
 * scratch board one by one so batteries behind them join the exchange.
 */
export function see(fen: string, square: Square, firstCapturer: Color): number {
  const board = new Chess(fen)
  const target = board.get(square)
  if (!target) return 0

  const gains: number[] = []
  let onSquare = PIECE_VALUE[target.type]
  let side = firstCapturer
  for (;;) {
    const capturer = leastValuableAttacker(board, square, side)
    if (!capturer) break
    gains.push(onSquare)
    onSquare = PIECE_VALUE[capturer.type]
    board.remove(capturer.square)
    side = opposite(side)
  }

  let net = 0
  for (let i = gains.length - 1; i >= 0; i--) net = Math.max(0, gains[i] - net)
  return net
}
