import type { Color, PieceSymbol, Square } from 'chess.js'

export type { Color, PieceSymbol, Square }

/**
 * A physical piece on the board with a stable identity across moves.
 * The 3D layer keys meshes by `id`, so a moved piece animates instead of remounting.
 * Promotion keeps the pawn's id and changes `type` (Phase 2 morphs it in place).
 */
export interface PieceInstance {
  readonly id: string
  readonly type: PieceSymbol
  readonly color: Color
  readonly square: Square
}

/** What the engine and the UI send to make a move. */
export interface MoveIntent {
  readonly from: Square
  readonly to: Square
  readonly promotion?: Exclude<PieceSymbol, 'p' | 'k'>
}

/**
 * A move that happened, enriched for animation and announcements.
 * `rookMove` is set for castling; `captureSquare` differs from `to` only for en passant.
 */
export interface PlayedMove {
  readonly ply: number
  readonly color: Color
  readonly piece: PieceSymbol
  readonly from: Square
  readonly to: Square
  readonly san: string
  readonly captured?: { readonly id: string; readonly type: PieceSymbol; readonly square: Square }
  readonly promotion?: Exclude<PieceSymbol, 'p' | 'k'>
  readonly rookMove?: { readonly id: string; readonly from: Square; readonly to: Square }
  readonly isCheck: boolean
  readonly fenAfter: string
}

export type GameStatus =
  | { readonly kind: 'playing' }
  | { readonly kind: 'checkmate'; readonly winner: Color }
  | { readonly kind: 'stalemate' }
  | { readonly kind: 'draw'; readonly reason: 'insufficient' | 'threefold' | 'fifty-move' }
