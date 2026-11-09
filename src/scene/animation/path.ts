import type { Square } from '../../rules/types'
import { squareIndex } from '../coords'

const FILES = 'abcdefgh'

/** The square at the elbow of a knight's L (two steps along the long leg). Null when not a knight move. */
export function knightCorner(from: Square, to: Square): Square | null {
  const a = squareIndex(from)
  const b = squareIndex(to)
  const df = Math.abs(b.file - a.file)
  const dr = Math.abs(b.rank - a.rank)
  if (df * dr !== 2) return null
  const file = df === 2 ? b.file : a.file
  const rank = df === 2 ? a.rank : b.rank
  return `${FILES[file]}${rank + 1}` as Square
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** One axis of a quadratic Bezier. */
export function quad(a: number, control: number, b: number, t: number): number {
  const u = 1 - t
  return u * u * a + 2 * u * t * control + t * t * b
}

/**
 * Control value that makes a quadratic Bezier between `a` and `b` peak at `peak` (at t = 0.5).
 */
export const quadControlForPeak = (a: number, b: number, peak: number): number => 2 * peak - (a + b) / 2

/** Euler x/z (small angles) for a lean whose top moves toward the XZ direction (dx, dz). */
export function leanEuler(dx: number, dz: number, angle: number): { x: number; z: number } {
  return { x: angle * dz, z: -angle * dx }
}
