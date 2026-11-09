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
  /** Tactics this move created for the mover, strongest first (TACTIC_PRIORITY order). */
  readonly tactics: readonly Tactic[]
}

export type GameStatus =
  | { readonly kind: 'playing' }
  | { readonly kind: 'checkmate'; readonly winner: Color }
  | { readonly kind: 'stalemate' }
  | { readonly kind: 'draw'; readonly reason: 'insufficient' | 'threefold' | 'fifty-move' }

/** Tactic kinds, strongest first. The first tactic of a move gets the callout label. */
export const TACTIC_PRIORITY = ['doubleCheck', 'discovered', 'fork', 'skewer', 'pin', 'backRank', 'sacrifice'] as const
export type TacticKind = (typeof TACTIC_PRIORITY)[number]

/**
 * A tactic the last move created, always in favour of the side that moved (`by`).
 * Squares are in the position after the move.
 */
export type Tactic =
  /** Two or more checkers at once. */
  | { readonly kind: 'doubleCheck'; readonly by: Color; readonly checkers: readonly Square[]; readonly king: Square }
  /** The moved piece stepped off a line and uncovered `attacker`'s attack on `target`. */
  | { readonly kind: 'discovered'; readonly by: Color; readonly mover: Square; readonly vacated: Square; readonly attacker: Square; readonly target: Square; readonly check: boolean }
  /** One piece attacks two or more worthwhile targets. */
  | { readonly kind: 'fork'; readonly by: Color; readonly attacker: Square; readonly targets: readonly Square[] }
  /** A slider attacks `front`; when it moves, `behind` (on the same line) falls. Front is worth more. */
  | { readonly kind: 'skewer'; readonly by: Color; readonly attacker: Square; readonly front: Square; readonly behind: Square }
  /** `pinned` cannot move without exposing `behind`. Absolute when `behind` is the king. */
  | { readonly kind: 'pin'; readonly by: Color; readonly attacker: Square; readonly pinned: Square; readonly behind: Square; readonly absolute: boolean }
  /** The enemy king is trapped on its back rank; `attacker` mates (mate) or threatens mate on `entry`. */
  | { readonly kind: 'backRank'; readonly by: Color; readonly attacker: Square; readonly king: Square; readonly entry: Square; readonly mate: boolean }
  /** The moved piece on `square` can be won; the mover gives up `loss` points of material by exchange. */
  | { readonly kind: 'sacrifice'; readonly by: Color; readonly square: Square; readonly piece: PieceSymbol; readonly loss: number }
