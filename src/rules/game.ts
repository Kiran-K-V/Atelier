import type { Chess, Move } from 'chess.js'
import type { RookMove } from './pieces'
import type { GameStatus, PieceInstance, PlayedMove, Square } from './types'

export function statusOf(chess: Chess): GameStatus {
  if (chess.isCheckmate()) return { kind: 'checkmate', winner: chess.turn() === 'w' ? 'b' : 'w' }
  if (chess.isStalemate()) return { kind: 'stalemate' }
  if (chess.isInsufficientMaterial()) return { kind: 'draw', reason: 'insufficient' }
  if (chess.isThreefoldRepetition()) return { kind: 'draw', reason: 'threefold' }
  if (chess.isDraw()) return { kind: 'draw', reason: 'fifty-move' }
  return { kind: 'playing' }
}

export function checkSquareOf(chess: Chess): Square | null {
  if (!chess.inCheck()) return null
  const turn = chess.turn()
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === turn) return cell.square
    }
  }
  return null
}

/** Squares of the pieces giving check to the side to move. Two entries means double check. */
export function checkersOf(chess: Chess): Square[] {
  const king = checkSquareOf(chess)
  return king ? chess.attackers(king, chess.turn() === 'w' ? 'b' : 'w') : []
}

export function legalTargets(chess: Chess, from: Square): Square[] {
  const targets = chess.moves({ square: from, verbose: true }).map((m) => m.to)
  // Promotions yield one move per piece; the board only needs each square once.
  return [...new Set(targets)]
}

export function isPromotionMove(chess: Chess, from: Square, to: Square): boolean {
  return chess
    .moves({ square: from, verbose: true })
    .some((m) => m.to === to && m.promotion !== undefined)
}

function promotionOf(p: Move['promotion']): PlayedMove['promotion'] {
  return p === undefined || p === 'p' || p === 'k' ? undefined : p
}

/** `chessAfter` must be the chess.js instance right after `move` was played. */
export function toPlayedMove(
  move: Move,
  ply: number,
  captured: PieceInstance | undefined,
  rookMove: RookMove | undefined,
  chessAfter: Chess,
): PlayedMove {
  return {
    ply,
    color: move.color,
    piece: move.piece,
    from: move.from,
    to: move.to,
    san: move.san,
    captured: captured && { id: captured.id, type: captured.type, square: captured.square },
    promotion: promotionOf(move.promotion),
    rookMove,
    isCheck: chessAfter.inCheck(),
    fenAfter: chessAfter.fen(),
  }
}
