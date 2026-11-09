import type { Color, PieceSymbol, Square, Tactic } from '../../rules/types'

/** Everything the planner needs to know about one move, derived after the store applied it. */
export interface MoveEvent {
  readonly ply: number
  readonly color: Color
  readonly piece: PieceSymbol
  readonly id: string
  readonly from: Square
  readonly to: Square
  readonly captured?: { readonly id: string; readonly type: PieceSymbol; readonly square: Square }
  readonly rookMove?: { readonly id: string; readonly from: Square; readonly to: Square }
  readonly promotion?: Exclude<PieceSymbol, 'p' | 'k'>
  readonly enPassant: boolean
  /** Squares of the pieces giving check after this move (empty when no check). */
  readonly checkers: readonly Square[]
  /** The checked king's square, when in check. */
  readonly kingSquare: Square | null
  readonly mate: boolean
  /** Tactics the move created for the mover, strongest first. */
  readonly tactics: readonly Tactic[]
}

export type MotionSignature =
  | 'pawnStep'
  | 'knightLeap'
  | 'bishopGlide'
  | 'rookSlide'
  | 'queenFlow'
  | 'kingProcession'
  /** Castling rook: a short hop over the king's path. */
  | 'rookHop'
  /** Reduced motion: place at once. */
  | 'instant'

/** How a captured piece leaves, chosen by the attacker's type. */
export type CaptureStyle =
  | 'topple' // pawn: knocked over backwards
  | 'shatter' // knight: struck from above, bursts into shards
  | 'slice' // bishop: cut diagonally, halves slide apart
  | 'shove' // rook: pushed off along the move line, tips over
  | 'dissolve' // queen: burns away into rising motes
  | 'dismiss' // king: bows out, sinks with a fade
  | 'fade' // reduced motion

export type FxEvent =
  | { readonly type: 'dustRing'; readonly square: Square }
  | { readonly type: 'ripple'; readonly square: Square; readonly strength: number }
  | { readonly type: 'trail'; readonly from: Square; readonly to: Square; readonly style: 'bishop' | 'queen'; readonly duration: number }
  | { readonly type: 'aura'; readonly square: Square }
  | { readonly type: 'impactFlash'; readonly square: Square }
  | { readonly type: 'threatLine'; readonly from: Square; readonly to: Square }
  | { readonly type: 'lightColumn'; readonly square: Square; readonly duration: number }
  | { readonly type: 'shards'; readonly square: Square; readonly color: Color; readonly direction: readonly [number, number] }
  | { readonly type: 'slash'; readonly square: Square; readonly direction: readonly [number, number] }
  | { readonly type: 'motes'; readonly square: Square; readonly color: Color }
  | { readonly type: 'ghostTrail'; readonly square: Square; readonly color: Color }
  | { readonly type: 'mood'; readonly mood: Mood }
  /**
   * A tactic's lines on the board. `primary` is the labelled one (bright); others are dimmer.
   * Persists until the next move, like the check line.
   */
  | { readonly type: 'tactic'; readonly tactic: Tactic; readonly primary: boolean }
  /** The callout word ("FORK!") floating over `square`, then fading. */
  | { readonly type: 'callout'; readonly tactic: Tactic; readonly square: Square; readonly duration: number }

export type Mood = 'normal' | 'check' | 'mate'

export type SoundCue =
  | 'pawnStep'
  | 'knightLand'
  | 'bishopWhoosh'
  | 'rookRumble'
  | 'queenSweep'
  | 'kingChime'
  | 'castle'
  | 'captureTopple'
  | 'captureShatter'
  | 'captureSlice'
  | 'captureShove'
  | 'captureDissolve'
  | 'captureDismiss'
  | 'check'
  | 'mate'
  | 'promotion'
  | 'enPassant'
  | 'illegal'
  /** Stinger under a tactic callout. */
  | 'tactic'

export type CameraAction =
  | { readonly type: 'shake'; readonly intensity: number; readonly duration: number }
  | { readonly type: 'focus'; readonly square: Square; readonly duration: number }
  | { readonly type: 'release'; readonly duration: number }

export type Beat =
  | {
      readonly kind: 'move'
      readonly at: number
      readonly id: string
      readonly signature: MotionSignature
      readonly from: Square
      readonly to: Square
      readonly duration: number
      /** True when the mover takes a piece; signatures may exaggerate (knight strikes higher). */
      readonly capturing: boolean
    }
  | {
      readonly kind: 'capture'
      readonly at: number
      readonly id: string
      readonly style: CaptureStyle
      readonly square: Square
      /** Unit XZ direction of the attack, for shove/slice/shards. */
      readonly direction: readonly [number, number]
    }
  | { readonly kind: 'morph'; readonly at: number; readonly id: string; readonly from: PieceSymbol; readonly to: PieceSymbol; readonly duration: number }
  | { readonly kind: 'topple'; readonly at: number; readonly square: Square }
  | { readonly kind: 'fx'; readonly at: number; readonly fx: FxEvent }
  | { readonly kind: 'sound'; readonly at: number; readonly cue: SoundCue; readonly square: Square }
  | { readonly kind: 'haptic'; readonly at: number; readonly pattern: number | readonly number[] }
  | { readonly kind: 'camera'; readonly at: number; readonly action: CameraAction }
  /** Scales playback of the whole plan from `at` for `duration` seconds of plan time. */
  | { readonly kind: 'timeScale'; readonly at: number; readonly scale: number; readonly duration: number }

export interface ChoreoPlan {
  readonly beats: readonly Beat[]
  /** Plan time (seconds) when every beat has finished. */
  readonly duration: number
}

export interface PlanOptions {
  readonly reducedMotion: boolean
  /** User setting: draw tactic lines and callouts. */
  readonly showTactics: boolean
}
