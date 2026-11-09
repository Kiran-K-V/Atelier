import type { PieceSymbol, Square, Tactic } from '../../rules/types'
import type { Beat, CaptureStyle, ChoreoPlan, MotionSignature, MoveEvent, PlanOptions, SoundCue } from './types'

const SIGNATURE: Record<PieceSymbol, MotionSignature> = {
  p: 'pawnStep',
  n: 'knightLeap',
  b: 'bishopGlide',
  r: 'rookSlide',
  q: 'queenFlow',
  k: 'kingProcession',
}

const CAPTURE_STYLE: Record<PieceSymbol, CaptureStyle> = {
  p: 'topple',
  n: 'shatter',
  b: 'slice',
  r: 'shove',
  q: 'dissolve',
  k: 'dismiss',
}

const CAPTURE_SOUND: Record<CaptureStyle, SoundCue> = {
  topple: 'captureTopple',
  shatter: 'captureShatter',
  slice: 'captureSlice',
  shove: 'captureShove',
  dissolve: 'captureDissolve',
  dismiss: 'captureDismiss',
  fade: 'captureTopple',
}

const MOVE_SOUND: Record<PieceSymbol, SoundCue> = {
  p: 'pawnStep',
  n: 'knightLand',
  b: 'bishopWhoosh',
  r: 'rookRumble',
  q: 'queenSweep',
  k: 'kingChime',
}

/** Board distance in squares (Euclidean, so diagonals read as longer). */
export function squareDistance(a: Square, b: Square): number {
  const df = a.charCodeAt(0) - b.charCodeAt(0)
  const dr = Number(a[1]) - Number(b[1])
  return Math.hypot(df, dr)
}

/** Unit direction of travel in board XZ (x = files toward h, z = ranks toward 1). */
export function direction(from: Square, to: Square): readonly [number, number] {
  const dx = to.charCodeAt(0) - from.charCodeAt(0)
  const dz = Number(from[1]) - Number(to[1])
  const len = Math.hypot(dx, dz) || 1
  return [dx / len, dz / len]
}

/**
 * Duration and impact time (when the piece lands or strikes) for each signature.
 * Each piece has its own tempo: the pawn is steady, the bishop quick, the rook heavy and
 * distance-bound, the king slow.
 */
export function signatureTiming(sig: MotionSignature, distance: number, capturing: boolean): { duration: number; impact: number } {
  switch (sig) {
    case 'pawnStep':
      return { duration: 0.46, impact: 0.4 }
    case 'knightLeap': {
      const duration = capturing ? 0.82 : 0.72
      return { duration, impact: duration * 0.86 }
    }
    case 'bishopGlide': {
      const duration = 0.22 + 0.05 * distance
      return { duration, impact: duration * 0.92 }
    }
    case 'rookSlide': {
      const duration = 0.3 + 0.07 * distance
      // The last 12% is the overshoot settle after the hard stop; impact is the stop.
      return { duration, impact: duration * 0.88 }
    }
    case 'queenFlow': {
      const duration = 0.28 + 0.05 * distance
      return { duration, impact: duration * 0.92 }
    }
    case 'kingProcession':
      return { duration: 0.95, impact: 0.85 }
    case 'rookHop':
      return { duration: 0.55, impact: 0.5 }
    case 'instant':
      return { duration: 0, impact: 0 }
  }
}

function beatEnd(b: Beat): number {
  switch (b.kind) {
    case 'move':
    case 'morph':
      return b.at + b.duration
    case 'capture':
      return b.at + 0.9
    case 'topple':
      return b.at + 1.4
    case 'camera':
      return b.at + b.action.duration
    case 'timeScale':
      return b.at + b.duration
    case 'fx':
      return b.at + ('duration' in b.fx ? b.fx.duration : 0.3)
    default:
      return b.at
  }
}

export function planMove(e: MoveEvent, { reducedMotion, showTactics }: PlanOptions): ChoreoPlan {
  const beats: Beat[] = []
  const add = (b: Beat) => beats.push(b)
  const capturing = e.captured !== undefined
  const distance = squareDistance(e.from, e.to)
  const signature: MotionSignature = reducedMotion ? 'instant' : SIGNATURE[e.piece]
  const main = signatureTiming(signature, distance, capturing)

  add({ kind: 'move', at: 0, id: e.id, signature, from: e.from, to: e.to, duration: main.duration, capturing })
  let settled = main.impact

  if (e.rookMove) {
    const rookSig: MotionSignature = reducedMotion ? 'instant' : 'rookHop'
    const rookAt = main.impact * 0.55
    const rook = signatureTiming(rookSig, squareDistance(e.rookMove.from, e.rookMove.to), false)
    add({ kind: 'move', at: rookAt, id: e.rookMove.id, signature: rookSig, from: e.rookMove.from, to: e.rookMove.to, duration: rook.duration, capturing: false })
    add({ kind: 'sound', at: rookAt + rook.impact, cue: 'castle', square: e.rookMove.to })
    if (!reducedMotion) add({ kind: 'fx', at: rookAt + rook.impact, fx: { type: 'dustRing', square: e.rookMove.to } })
    settled = Math.max(settled, rookAt + rook.impact)
  } else {
    add({ kind: 'sound', at: e.piece === 'b' || e.piece === 'q' || e.piece === 'r' ? 0 : main.impact, cue: MOVE_SOUND[e.piece], square: e.to })
  }

  if (!reducedMotion) addSignatureFx(e, main, distance, capturing, add)

  if (e.captured) {
    const style: CaptureStyle = reducedMotion ? 'fade' : CAPTURE_STYLE[e.piece]
    const dir = direction(e.from, e.to)
    add({ kind: 'capture', at: main.impact, id: e.captured.id, style, square: e.captured.square, direction: dir })
    add({ kind: 'sound', at: main.impact, cue: CAPTURE_SOUND[style], square: e.captured.square })
    add({ kind: 'haptic', at: main.impact, pattern: 20 })
    if (style === 'shatter') add({ kind: 'fx', at: main.impact, fx: { type: 'shards', square: e.captured.square, color: e.color === 'w' ? 'b' : 'w', direction: dir } })
    if (style === 'slice') add({ kind: 'fx', at: main.impact - 0.04, fx: { type: 'slash', square: e.captured.square, direction: dir } })
    if (style === 'dissolve') add({ kind: 'fx', at: main.impact, fx: { type: 'motes', square: e.captured.square, color: e.color === 'w' ? 'b' : 'w' } })
    if (e.enPassant) {
      add({ kind: 'sound', at: 0, cue: 'enPassant', square: e.to })
      if (!reducedMotion) add({ kind: 'fx', at: 0, fx: { type: 'ghostTrail', square: e.to, color: e.color === 'w' ? 'b' : 'w' } })
    }
  }

  if (e.promotion) {
    const at = main.impact + 0.08
    const duration = reducedMotion ? 0 : 1.1
    add({ kind: 'morph', at, id: e.id, from: 'p', to: e.promotion, duration })
    add({ kind: 'sound', at: main.impact, cue: 'promotion', square: e.to })
    add({ kind: 'haptic', at: main.impact, pattern: [8, 30, 8] })
    if (!reducedMotion) add({ kind: 'fx', at: main.impact, fx: { type: 'lightColumn', square: e.to, duration: 1.4 } })
    settled = Math.max(settled, at + duration)
  }

  if (showTactics && e.tactics.length > 0) addTactics(e, settled, main.impact, add)

  if (e.kingSquare && e.checkers.length > 0) {
    const king = e.kingSquare
    const at = e.mate ? main.impact : settled + 0.05
    for (const from of e.checkers) add({ kind: 'fx', at, fx: { type: 'threatLine', from, to: king } })
    if (e.mate) addMate(king, main.impact, reducedMotion, add)
    else {
      add({ kind: 'sound', at, cue: 'check', square: king })
      add({ kind: 'haptic', at, pattern: [10, 40, 10] })
      add({ kind: 'fx', at, fx: { type: 'mood', mood: 'check' } })
    }
  } else {
    add({ kind: 'fx', at: settled, fx: { type: 'mood', mood: 'normal' } })
  }

  beats.sort((a, b) => a.at - b.at)
  return { beats, duration: beats.reduce((m, b) => Math.max(m, beatEnd(b)), 0) }
}

/** Most tactics a single move draws; the rest are rare and would only clutter the board. */
export const MAX_TACTICS = 3
/** Gap after the move settles before the tactic reveal starts. */
export const TACTIC_DELAY = 0.12
const TACTIC_STAGGER = 0.12
/** The label lands while the primary tactic's lines are still drawing. */
const CALLOUT_DELAY = 0.18
export const CALLOUT_DURATION = 1.6

/** The square the callout floats over: the piece the tactic is about. */
export function tacticAnchor(t: Tactic): Square {
  switch (t.kind) {
    case 'fork':
      return t.attacker
    case 'pin':
      return t.pinned
    case 'skewer':
      return t.front
    case 'discovered':
      return t.target
    case 'doubleCheck':
      return t.king
    case 'backRank':
      return t.entry
    case 'sacrifice':
      return t.square
  }
}

/**
 * Tactics read after the move lands: lines reveal in priority order, then the label for the strongest.
 * On mate the cinematic owns the stage (T6); only a back-rank mate keeps its label.
 */
function addTactics(e: MoveEvent, settled: number, impact: number, add: (b: Beat) => void): void {
  if (e.mate) {
    const backRank = e.tactics.find((t) => t.kind === 'backRank' && t.mate)
    if (backRank) add({ kind: 'fx', at: impact + 0.3, fx: { type: 'callout', tactic: backRank, square: tacticAnchor(backRank), duration: CALLOUT_DURATION } })
    return
  }
  const at = settled + TACTIC_DELAY
  e.tactics.slice(0, MAX_TACTICS).forEach((tactic, i) => {
    add({ kind: 'fx', at: at + i * TACTIC_STAGGER, fx: { type: 'tactic', tactic, primary: i === 0 } })
  })
  const primary = e.tactics[0]
  const square = tacticAnchor(primary)
  const calloutAt = at + CALLOUT_DELAY
  add({ kind: 'fx', at: calloutAt, fx: { type: 'callout', tactic: primary, square, duration: CALLOUT_DURATION } })
  add({ kind: 'sound', at: calloutAt, cue: 'tactic', square })
  add({ kind: 'haptic', at: calloutAt, pattern: 8 })
}

function addSignatureFx(
  e: MoveEvent,
  t: { duration: number; impact: number },
  distance: number,
  capturing: boolean,
  add: (b: Beat) => void,
): void {
  switch (e.piece) {
    case 'p':
      add({ kind: 'fx', at: t.impact, fx: { type: 'dustRing', square: e.to } })
      add({ kind: 'haptic', at: t.impact, pattern: 6 })
      break
    case 'n':
      add({ kind: 'fx', at: t.impact, fx: { type: 'ripple', square: e.to, strength: capturing ? 1 : 0.6 } })
      if (capturing) add({ kind: 'fx', at: t.impact, fx: { type: 'impactFlash', square: e.to } })
      add({ kind: 'camera', at: t.impact, action: { type: 'shake', intensity: capturing ? 0.22 : 0.12, duration: 0.3 } })
      add({ kind: 'haptic', at: t.impact, pattern: 12 })
      break
    case 'b':
      add({ kind: 'fx', at: 0.02, fx: { type: 'trail', from: e.from, to: e.to, style: 'bishop', duration: t.duration } })
      break
    case 'r':
      if (distance >= 4) add({ kind: 'camera', at: t.duration * 0.2, action: { type: 'shake', intensity: 0.12 + 0.04 * (distance - 4), duration: t.duration * 0.9 } })
      add({ kind: 'fx', at: t.impact, fx: { type: 'dustRing', square: e.to } })
      add({ kind: 'haptic', at: t.impact, pattern: 14 })
      break
    case 'q':
      add({ kind: 'fx', at: 0.02, fx: { type: 'trail', from: e.from, to: e.to, style: 'queen', duration: t.duration } })
      add({ kind: 'fx', at: t.impact, fx: { type: 'impactFlash', square: e.to } })
      break
    case 'k':
      add({ kind: 'fx', at: 0, fx: { type: 'aura', square: e.from } })
      add({ kind: 'fx', at: t.impact, fx: { type: 'aura', square: e.to } })
      break
  }
}

function addMate(king: Square, impact: number, reducedMotion: boolean, add: (b: Beat) => void): void {
  add({ kind: 'fx', at: impact + 0.15, fx: { type: 'mood', mood: 'mate' } })
  add({ kind: 'haptic', at: impact, pattern: [20, 60, 40] })
  if (reducedMotion) {
    add({ kind: 'sound', at: impact, cue: 'mate', square: king })
    return
  }
  add({ kind: 'timeScale', at: Math.max(0, impact - 0.2), scale: 0.35, duration: 0.45 })
  add({ kind: 'camera', at: impact + 0.1, action: { type: 'focus', square: king, duration: 1.6 } })
  add({ kind: 'topple', at: impact + 0.9, square: king })
  add({ kind: 'sound', at: impact + 0.9, cue: 'mate', square: king })
}
