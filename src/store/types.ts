import type { BoardSet } from '../design/tokens'
import type { Color, GameStatus, MoveIntent, PieceInstance, PlayedMove, Square } from '../rules/types'

export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6
export type QualityTier = 'low' | 'medium' | 'high'
export type ThemePreference = 'system' | 'light' | 'dark'

/** Game truth. The scene and UI render this and call actions; they never call chess.js. */
export interface GameState {
  readonly fen: string
  readonly pieces: readonly PieceInstance[]
  readonly history: readonly PlayedMove[]
  readonly turn: Color
  readonly status: GameStatus
  /** King square of the side to move when in check, else null. */
  readonly checkSquare: Square | null
  /** Squares of the pieces giving that check. */
  readonly checkers: readonly Square[]
  readonly playerColor: Color
  readonly difficulty: Difficulty
  readonly engine: 'loading' | 'ready' | 'thinking' | 'error'
  readonly selected: Square | null
  /** Legal destinations of `selected`. */
  readonly legalTargets: readonly Square[]
  /** Keyboard focus square for keyboard play, null when not using keyboard. */
  readonly cursor: Square | null
  /** Set while the player picks a promotion piece. */
  readonly pendingPromotion: { readonly from: Square; readonly to: Square } | null
  /** Bumped on each rejected move so the scene can play a snap-back shake. */
  readonly illegalAttempt: { readonly square: Square; readonly nonce: number } | null
  readonly orientation: Color
}

export interface GameActions {
  /** Click on a square: selects own piece, moves to a legal target, or clears. */
  clickSquare: (square: Square) => void
  /** Hover preview: legal targets for the piece on `square` without selecting. */
  hoverSquare: (square: Square | null) => void
  /** Drag start/drop path. Returns true if the move was accepted. */
  tryMove: (intent: MoveIntent) => boolean
  choosePromotion: (piece: NonNullable<MoveIntent['promotion']>) => void
  cancelPromotion: () => void
  moveCursor: (square: Square | null) => void
  newGame: (playerColor: Color) => void
  /** Undo the last full turn (player move plus engine reply). */
  undo: () => void
  flipBoard: () => void
  setDifficulty: (d: Difficulty) => void
}

export interface SettingsState {
  readonly theme: ThemePreference
  /** Material set for the board, pieces and UI palette. */
  readonly boardSet: BoardSet
  readonly quality: QualityTier
  /** True when the user chose "auto"; the probe may then change `quality`. */
  readonly qualityAuto: boolean
  /** OS preference OR user toggle. */
  readonly reducedMotion: boolean
  readonly reducedMotionUser: boolean | null
  readonly sound: boolean
  /** Draw tactic lines and callouts after a move. */
  readonly tactics: boolean
}

export interface SettingsActions {
  setTheme: (t: ThemePreference) => void
  setBoardSet: (s: BoardSet) => void
  setQuality: (q: QualityTier | 'auto') => void
  setDetectedQuality: (q: QualityTier) => void
  setReducedMotion: (v: boolean | null) => void
  setSound: (v: boolean) => void
  setTactics: (v: boolean) => void
}
