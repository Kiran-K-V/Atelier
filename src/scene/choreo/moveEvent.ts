import type { GameStatus, PieceInstance, PlayedMove, Square } from '../../rules/types'
import type { MoveEvent } from './types'

export interface PositionAfter {
  readonly checkers: readonly Square[]
  readonly checkSquare: Square | null
  readonly status: GameStatus
}

/** Enriches a played move with piece ids and check state. Null if the mover is not on `to`. */
export function toMoveEvent(played: PlayedMove, pieces: readonly PieceInstance[], after: PositionAfter): MoveEvent | null {
  const mover = pieces.find((p) => p.square === played.to)
  if (!mover) return null
  return {
    ply: played.ply,
    color: played.color,
    piece: played.piece,
    id: mover.id,
    from: played.from,
    to: played.to,
    captured: played.captured,
    rookMove: played.rookMove,
    promotion: played.promotion,
    enPassant: played.captured !== undefined && played.captured.square !== played.to,
    checkers: after.checkers,
    kingSquare: after.checkSquare,
    mate: after.status.kind === 'checkmate',
    tactics: played.tactics,
  }
}
